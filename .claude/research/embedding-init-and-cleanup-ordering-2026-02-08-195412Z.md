---
paths:
  - "src/programs/**/*.c"
  - "src/archives/quickjs-full-init.c"
  - "src/quickjs-modulesys/quickjs-modulesys.c"
  - "src/quickjs-eventloop/quickjs-eventloop.c"
---

# Embedding Init and Cleanup Ordering

## Initialization Order

The full initialization sequence has dependency constraints that aren't documented anywhere except implicitly by the program source files. Validated across `qjs.c`, `quickjs-run.c`, and `qjsbootstrap.c`:

1. `JS_NewRuntime()`
2. `js_os_set_worker_new_context_func(factory)` — must be before `js_eventloop_init`. The function pointer is a **global** (not runtime-scoped), so calling it once is sufficient even with multiple runtimes, but it must be set before any worker could be spawned.
3. `js_eventloop_init(rt)` — allocates `JSThreadState`, sets up SAB handlers. Must be before context creation because worker infrastructure depends on the thread state existing.
4. `JS_SetCanBlock(rt, TRUE)` — enables `Atomics.wait()` and workers. Without this, workers can't be created.
5. `ctx = JS_NewCustomContext(rt)` which internally does:
   - `JS_NewContextRaw(rt)`
   - `JS_AddIntrinsicBaseObjects(ctx)` — **must be the first intrinsic** (defines Object, Function, Array, etc. that all other intrinsics depend on)
   - Other intrinsics in any order (Date, Eval, RegExp, JSON, Proxy, MapSet, TypedArrays, Promise, BigInt)
   - `quickjs_full_init(ctx)` — **must be last** (registers `quickjs:std`, `quickjs:os`, etc. which depend on intrinsics; also adds `print`, `console`, `inspect` globals)
6. `QJMS_InitState(rt)` — allocates module loader state, registers normalize/loader funcs on runtime
7. `QJMS_InitContext(ctx, TRUE)` — creates ModuleDelegate, sets up `require` global. **Depends on step 5** having completed — the ModuleDelegate bootstrap calls `std.loadFile`, `os.realpath`, `os.access`, `os.stat` during initialization.

## Cleanup Order

Two valid orderings exist in the codebase:

- `qjs.c`: `js_eventloop_free(rt)` → `QJMS_FreeState(rt)` → `JS_FreeContext(ctx)` → `JS_FreeRuntime(rt)`
- `quickjs-run.c`: `QJMS_FreeState(rt)` → `js_eventloop_free(rt)` → `JS_FreeContext(ctx)` → `JS_FreeRuntime(rt)`

Both work because `QJMS_FreeState` and `js_eventloop_free` operate on separate runtime opaque data (module loader opaque vs runtime opaque). The invariant that matters: **both module-sys and eventloop state must be freed before `JS_FreeContext`**, because freeing those states releases JS values that need the context alive. And context must be freed before runtime.

## `defineBuiltinModule` user_data Lifetime

When `defineBuiltinModule()` (in quickjs-engine.c) creates a user-defined builtin module, it passes a pointer to the exports object as `user_data` to `JS_NewCModule`. The module init function (`js_userdefined_module_init`) reads exports from this pointer, then **sets user_data to NULL**. This means the exports object pointer is only valid during the first (and only) module initialization. The `JS_RunModule` call in `defineBuiltinModule` forces immediate initialization while the pointer is still valid.
