---
paths:
  - "src/builtin-modules/quickjs-bytecode/**/*"
---

# Bytecode Serialization Gotchas

## `toValue()` Returns a BoundFunction, Not Raw Bytecode

When `bytecode.toValue()` deserializes a buffer and the result has tag `JS_TAG_FUNCTION_BYTECODE` or `JS_TAG_MODULE`, it does **not** return the raw bytecode object. Instead, it:

1. Creates a C function `js_call_bytecode_func` (line 9)
2. Calls `Function.prototype.bind(callfunc, bytecodeObj)` (line 148)
3. Returns the resulting BoundFunction

The bytecode object becomes `this` in the bound function. When called, `js_call_bytecode_func` receives the bytecode as `this_val`, handles module resolution if needed (`JS_ResolveModule` + `QJMS_SetModuleImportMeta`), then calls `JS_EvalFunction`.

This means `typeof result === "function"` is true, but it's a BoundFunction — not the raw bytecode. This matters if you're inspecting the result or expecting a specific internal type.

## Why the Bind Wrapper Exists

Raw bytecode values (`JS_TAG_FUNCTION_BYTECODE`) cannot be called from JavaScript. They require the C API function `JS_EvalFunction()` to execute. The bind wrapper provides a JS-callable entry point. For modules specifically, it also ensures `JS_ResolveModule` and `QJMS_SetModuleImportMeta` are called before evaluation — without this, module imports wouldn't resolve and `import.meta` would be uninitialized.

## Write vs Read Flag Asymmetry

**Write** (`fromValue`): Uses `JS_WRITE_OBJ_BYTECODE` with optional `JS_WRITE_OBJ_BSWAP` (controlled by `{ byteSwap: true }` option). Does **not** include `JS_WRITE_OBJ_SAB` or `JS_WRITE_OBJ_REFERENCE`.

**Read** (`toValue`): Always uses `JS_READ_OBJ_BYTECODE | JS_READ_OBJ_REFERENCE | JS_READ_OBJ_SAB` (line 99).

The read side is more permissive than the write side. There is no explicit flag-matching validation — if the buffer contains data types that the read flags don't support, `JS_ReadObject` will throw an exception. The write flags from `fromValue` are a subset of what `toValue` can read, so round-tripping through `fromValue`→`toValue` always works. But bytecode produced by other means (e.g., worker message serialization with SAB flags) might contain data that `fromValue` wouldn't have produced.
