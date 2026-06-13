---
paths:
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
  - "src/quickjs/quickjs.c"
  - "src/quickjs/quickjs.h"
---

# `JS_SetClassProto` consumes the prototype reference (no leak in js_os_init error path)

## Fact

`JS_SetClassProto(ctx, class_id, proto)` consumes (takes ownership of) the `proto` reference. Its implementation is just `set_value(ctx, &ctx->class_proto[class_id], obj)` ([quickjs.c:2686-2691](../../src/quickjs/quickjs.c#L2686)), which stores the value into the context's `class_proto` slot without dup'ing it. After calling it, the local `proto` variable is a consumed reference, so you must NOT `JS_FreeValue` it. The stored proto is released when the context is torn down.

This matches the existing note in `.claude/rules/quickjs-gc-patterns.md` ("`JS_SetClassProto` consumes the prototype").

## Why this matters / what was checked

In `js_os_init`'s Worker-class setup ([quickjs-os.c:5231-5269](../../src/builtin-modules/quickjs-os/quickjs-os.c#L5231)), the `initialData` deserialize-failure path does:

```c
if (JS_IsException(data)) {
    JS_FreeValue(ctx, obj);
    return -1;
}
```

This is already correct. On that path the only reference the scope still owns is `obj` (the `JS_NewCFunction2` constructor result; `JS_SetConstructor` does NOT consume its args, and nothing else stores `obj`). `proto` was already consumed by `JS_SetClassProto` a few lines above, so it must not be freed here. Adding a `JS_FreeValue(ctx, proto)` would be a double-free (freed here, then again at context teardown via `ctx->class_proto[]`).

A code review (2026-06-13) initially flagged a possible `proto` leak on this path; that was incorrect. Verified by reading the `JS_SetClassProto` implementation. No fix is needed; do not "fix" it.
