---
paths:
  - "src/builtin-modules/**/*.c"
---

# QuickJS GC and Reference Counting Patterns

When writing C code for QuickJS builtin modules (`quickjs:os`, `quickjs:std`, etc.), follow these reference counting rules carefully to avoid GC assertion failures (`list_empty(&rt->gc_obj_list)`).

## Core Rules

### `JS_GetProperty` returns a new reference
`JS_GetProperty()` increments the refcount of the returned value. You **must** call `JS_FreeValue(ctx, val)` when done with it, including in every error path.

```c
// CORRECT
JSValue val = JS_GetProperty(ctx, obj, atom);
if (JS_IsException(val))
    goto fail;  // JS_EXCEPTION doesn't need freeing
// ... use val ...
JS_FreeValue(ctx, val);  // must free after use
```

### `JS_DefinePropertyValueStr` consumes the value
`JS_DefinePropertyValueStr()` takes ownership of the value argument. Do **not** free a value after passing it to this function.

```c
// CORRECT - js_new_win32_handle return value is consumed
JS_DefinePropertyValueStr(ctx, obj, "handle",
    js_new_win32_handle(ctx, h), JS_PROP_C_W_E);
// Do NOT call JS_FreeValue on the handle after this
```

### `JS_SetModuleExport` consumes the value
Same as `JS_DefinePropertyValueStr` -- takes ownership.

### `JS_SetClassProto` consumes the prototype
The prototype value is consumed. Do not free it after `JS_SetClassProto`.

### `JS_SetConstructor` does NOT consume either argument
Both the constructor and prototype remain owned by the caller.

### `argv[]` values are borrowed
Function arguments (`argv[0]`, etc.) are borrowed references. Do **not** free them.

### `JS_ToCString` / `JS_FreeCString` are paired
Strings from `JS_ToCString` must be freed with `JS_FreeCString`, not `JS_FreeValue`.

## Common Patterns

### Option object property reading
When reading properties from a JS options object, always free the property value after extracting the native data from it:

```c
JSAtom atom = JS_NewAtom(ctx, "propName");
if (JS_HasProperty(ctx, options, atom)) {
    JSValue val = JS_GetProperty(ctx, options, atom);
    JS_FreeAtom(ctx, atom);
    if (JS_IsException(val))
        goto fail;
    // extract native data from val...
    JS_FreeValue(ctx, val);  // free AFTER extraction
} else {
    JS_FreeAtom(ctx, atom);
}
```

### Error paths must free too
Every `goto fail` path must free any `JS_GetProperty` return values that are still live. Be thorough -- add `JS_FreeValue` beside every error case, not just the success path.

## Class Finalizers for Native Resources

When wrapping native resources (file handles, pointers, etc.) that need cleanup, use a JSClassDef with a `.finalizer`:

```c
static void my_finalizer(JSRuntime *rt, JSValue val) {
    MyData *data = JS_GetOpaque(val, my_class_id);
    if (data) {
        // clean up native resource
        js_free_rt(rt, data);
    }
}

static JSClassDef my_class = {
    "MyClass",
    .finalizer = my_finalizer,
};
```

The finalizer runs during GC when the object is collected. If the resource can be explicitly released (like `CloseHandle`), mark it as released so the finalizer doesn't double-free.
