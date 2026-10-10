---
paths:
  - "src/builtin-modules/quickjs-bytecode/**/*"
---

# `bytecode.toValue()` wrapper: who owns the revived bytecode object

`toValue` wraps a function or module bytecode object in a bound function whose bound `this` is that object (see [bytecode-serialization-gotchas](bytecode-serialization-gotchas-2026-02-08-195412Z.md)). Three ownership rules meet in that wrapper, in [quickjs-bytecode.c](../../src/builtin-modules/quickjs-bytecode/quickjs-bytecode.c).

## The rules

- `JS_EvalFunction(ctx, fun_obj)` frees `fun_obj` on every path. In `JS_EvalFunctionInternal` ([quickjs.c](../../src/quickjs/quickjs.c)), `js_closure` takes it for function bytecode, and the module branch calls `JS_FreeValue` on it before linking. A caller that wants to keep the value passes a `JS_DupValue`.
- A native function's `this_val` is borrowed. `js_call_bytecode_func` runs as the target of the bound function, so its `this_val` is the bound function's own reference to the bytecode object.
- `Function.prototype.bind` takes its own reference to the bound `this` (`bf->this_val = JS_DupValue(ctx, argv[0])` in `js_function_bind`). After binding, `toValue` still owns the reference `JS_ReadObject` returned and has to free it.

## What getting them wrong looks like

`toValue` used to keep its reference, and the wrapper used to pass the borrowed `this_val` straight to `JS_EvalFunction`. One call happened to cancel the two mistakes out. Observed on a build from before the fix, the same for script and module bytecode:

| Calls to the revived function | Result |
| --- | --- |
| 0 | abort at exit: `Assertion failed: (list_empty(&rt->gc_obj_list))` in `JS_FreeRuntime` |
| 1 | fine |
| 2 | abort: `Assertion failed: (js_rc(p)->ref_count > 0)` in `gc_decref_child` |
| 3 | the process dies from a signal, with no assertion message |

`tests/libbytecode.test.ts` covers 0 calls and 3 calls.

## Calling semantics

- Script bytecode runs again on every call.
- Module bytecode is evaluated on the first call only. Later calls return `undefined` without running the body again.
- If the module body threw, every call throws that same error, and the body still ran only once.
- A module that uses top-level await throws a TypeError ("cannot synchronously load module") on every call, because the wrapper uses the synchronous `JS_EvalFunction`.

## `fromFile` loads a module's imports at compile time

`bytecode.fromFile` on a module throws if one of its imports is missing or does not parse. `__JS_EvalInternal` calls `js_resolve_module` right after compiling a module, and `JS_EVAL_FLAG_COMPILE_ONLY` does not skip that. The bytecode only contains the one module. Its imports are resolved again, by `JS_ResolveModule` in the wrapper, each time the revived function is called.

## A failed import resolution is retried

Compile a module that has an import to a bytecode file, then revive it in another process where that import cannot be loaded. Calling the revived function throws the resolution error. Calling it again tries to load the imports again: the same error while the import is still unavailable, a normal run once it is. An ordinary `import()` of a file whose own import is missing already behaved this way, because the engine frees a source module whose resolution failed and compiles it afresh next time. A module read from bytecode is not freed, since the bound function still holds it, so the engine has to leave it in a state that can be resolved again. Two things in [quickjs.c](../../src/quickjs/quickjs.c) make that work, and neither is in upstream:

- `js_resolve_module` sets `m->resolved = TRUE` before it resolves the imports, and clears it again at its `fail` label. Upstream leaves it set. A second `JS_ResolveModule` then reports success, and `JS_EvalFunction` reaches `js_create_module_function`, which recurses into every `rme->module` without a NULL check. That was a SIGSEGV; the backtrace in the macOS crash report read `js_create_module_function` <- `js_create_module_function` <- `JS_EvalFunctionInternal` <- `js_call_bytecode_func`.
- `js_free_modules(ctx, JS_FREE_MODULE_NOT_RESOLVED)` only drops an unresolved module that nothing but `ctx->loaded_modules` references (`ref_count == 1`). It runs after a failed resolve in `JS_ResolveModule`, `JS_LoadModuleInternal`, `js_dynamic_import_run` and `JS_RunModule`, and upstream's version drops every unresolved module, which includes every revived module that has not been called yet.

The second point matters because `js_import_meta` finds the running module by looking its filename up in `ctx->loaded_modules`. With only the flag fix in place, a revived module that had been dropped from the list still ran on a later call, but `import.meta` threw "import.meta not supported in this context", and an `import` of its path loaded a second instance from the source file.

The same two changes cover the other routes to a revived module whose import failed: being imported by another revived module, being called directly after that, and `import()` of its path. All of those used to segfault, and `tests/libbytecode-failed-import.test.ts` covers them. An `import()` of the path after the bound function has been garbage collected also used to segfault and now works; that case was only checked by hand.

## Only the wrapper and the loaders fill in `import.meta`

`QJMS_SetModuleImportMeta` is called from `js_call_bytecode_func`, `QJMS_ModuleLoader`, `qjms_eval_buf_impl` and `qjms_eval_binary_impl`. A revived module that is first reached some other way, as an import of another module or through `import()` of its path, goes through none of them, so its `import.meta` object exists but is empty and `import.meta.url` is `undefined`. This does not depend on any load failing, and a build from September 2026 behaves the same. Calling the module's own revived function first avoids it.
