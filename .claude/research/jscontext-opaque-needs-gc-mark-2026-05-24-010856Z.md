---
paths:
  - "src/quickjs/quickjs.c"
  - "src/builtin-modules/quickjs-context/quickjs-context.c"
---

# Class Instances That Hold a `JSContext*` in Opaque Need a `gc_mark`

## The pattern

`quickjs:context` wraps each sub-`JSContext` in a JSObject and stores
the `JSContext *` in its opaque slot via `JS_SetOpaque`. The class
finalizer (`js_context_finalizer`) drops the inner `JSContext` when
the wrapper is collected.

The GC's `mark_children` does NOT traverse opaque pointers (a class
with no `gc_mark` is invisible at the opaque link). That used to cause
two related failures at runtime shutdown:

1. **Nested contexts:** N levels of nested `Context`s required N+1 GC
   passes, because each pass only finalized one level's wrappers and
   the next pass had to see the freshly-collectable objects in their
   realm. The original `JS_FreeRuntime` from `8e902b7a` (March 2023)
   hardcoded 2 passes with a TODO; a `deeply-nested contexts` test
   added in May 2026 hit the limit and crashed with `Assertion failed:
   list_empty(&rt->gc_obj_list)` at the end of `JS_FreeRuntime`.

2. **Cross-realm cycles:** `ctx1.globalThis.peer = ctx2;
   ctx2.globalThis.peer = ctx1` is a logical cycle the collector
   cannot see (the inter-context link runs through opaque). No number
   of GC passes can resolve it; each pass makes no progress.

## The fix

Register a `gc_mark` callback on the `Context` class that marks the
inner `JSContext`'s GC header. That exposes the opaque link to the
cycle collector, which then resolves both nested-context shutdown and
cross-realm cycles in a single pass.

The public helper `JS_MarkContext(rt, ctx, mark_func)` in `quickjs.h`
exists for this purpose. (There is also a static
`JS_MarkContextChildren` in `quickjs.c` used internally by
`mark_children` to walk a JSContext's roots — different job; don't
confuse them.)

Pattern any future class that owns a `JSContext *` in opaque should
follow:

```c
static void my_class_gc_mark(JSRuntime *rt, JSValueConst val,
                             JS_MarkFunc *mark_func) {
    JSContext *inner = JS_GetOpaque(val, my_class_id);
    JS_MarkContext(rt, inner, mark_func);
}

static JSClassDef my_class = {
    "MyClass",
    .finalizer = my_finalizer,
    .gc_mark = my_class_gc_mark,
};
```

With `gc_mark` in place, `JS_FreeRuntime` only needs a single
`JS_RunGCInternal(rt, FALSE)` pass — no loop, no fixed-N count — and
the `assert(list_empty(&rt->gc_obj_list))` afterwards becomes a real
leak detector again instead of a tripwire for nesting depth.

Note: keep `remove_weak_objects=FALSE` during shutdown to avoid queuing
new jobs via FinalizationRegistry.
