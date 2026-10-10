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

## Open hazard: a second call after a failed import resolution segfaults

Compile a module that has an import to a bytecode file, then revive it in another process where that import cannot be loaded. The first call throws the resolution error, as it should. A second call crashes with SIGSEGV. This is a separate bug from the reference counting above, and builds from before that fix crash the same way.

The mechanism, read from the code and matched against the backtrace in the macOS crash report (`js_create_module_function` <- `js_create_module_function` <- `JS_EvalFunctionInternal` <- `js_call_bytecode_func`):

1. `js_resolve_module` sets `m->resolved = TRUE` before it resolves the imports and does not clear it when one fails, which leaves that import's `rme->module` NULL.
2. On the next call, `JS_ResolveModule` sees `resolved` and reports success.
3. `JS_EvalFunction` reaches `js_create_module_function`, which recurses into every `rme->module` without a NULL check.

The only other caller of `JS_ResolveModule` in this repo, in [quickjs-modulesys.c](../../src/quickjs-modulesys/quickjs-modulesys.c), frees the module value when resolution fails and never evaluates it. The bound function is what keeps a failed module callable.
