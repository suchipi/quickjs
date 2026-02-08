---
paths:
  - "src/quickjs-modulesys/**/*"
---

# ModuleDelegate Initialization

## Bootstrap Sequence

`QJMS_MakeModuleDelegateObject()` (quickjs-modulesys.c:703) performs a multi-step JS↔C dance:

1. C creates a plain `ModuleDelegate` object with `searchExtensions: [".js"]` and empty `compilers` object
2. Sets it as temporary global `__qjms_temp_ModuleDelegate`
3. Evaluates `qjsc_module_impl` bytecode (compiled from `module-impl.js`)
4. That JS code defines `__qjms_temp_ModuleDelegate_init` on globalThis
5. C retrieves the init function and calls it with 7 C-function references as arguments: `loadFile`, `realpath`, `access`, `stat`, `F_OK`, `S_IFMT`, `S_IFREG`
6. The init function populates `ModuleDelegate.resolve` and `ModuleDelegate.read` using those C helpers
7. C deletes both temp globals from globalThis

This means `ModuleDelegate.resolve` and `ModuleDelegate.read` are JS closures that close over C function wrappers. They don't exist until step 6 completes.

## NormalizeModuleName Fallback

`QJMS_NormalizeModuleName` (line 208-212) checks if `ModuleDelegate` is an object. If it isn't (or doesn't exist yet), it returns the original module name unchanged rather than throwing. This is essential for `qjsc` to work — the bytecode compiler loads modules via C-level APIs without the full JS module delegate infrastructure, so `NormalizeModuleName` must gracefully degrade.

## `__cjsExports` Unwrapping

`QJMS_InteropUnwrapExports()` (line 541-573) is called by `require()` after `JS_DynamicImportSync`. It checks if the module namespace has a `__cjsExports` property. If present, returns that value instead of the namespace. This is how CJS/ESM interop works:

```javascript
// A module that works with both import and require:
export const foo = 1;
export const __cjsExports = { foo: 1, default: something };
// import gets the namespace; require() gets __cjsExports
```

The ownership semantics of this function are unusual (documented in the comment at line 535): it may or may not free the input `module_ns` depending on the code path. Callers must treat the return value as a new live value regardless.

## Main Module Tracking

The "main module" name is stored in a fixed 4096-byte buffer (`MAIN_MODULE_NAME_SIZE`) in `QJMS_State`, allocated once per runtime. Set via `pstrcpy` (line 107), checked via `strncmp` (line 125). Only one main module per runtime. Module paths longer than 4095 characters will be silently truncated.

## Extension Search Order

In `module-impl.js`, the `resolve()` function tries paths in this order:

1. Path as-is (checking `access(path, F_OK)` + `stat` confirms `S_IFREG`)
2. For each extension in `searchExtensions`: `path + ext`
3. For each extension in `searchExtensions`: `path/index + ext`

First match wins. The `isValidFile` helper rejects directories (checks `S_IFREG`), preventing a directory named `foo.js` from matching.

## `defineBuiltinModule` Double-Init Guard

In `quickjs-engine.c`, `js_userdefined_module_init` sets `JS_SetModuleUserData(m, NULL)` after the first invocation (the user_data pointer to the exports object is only valid during the `defineBuiltinModule` call that created it). If the init function is somehow called again, it gets NULL user_data and returns 0 without setting any exports.
