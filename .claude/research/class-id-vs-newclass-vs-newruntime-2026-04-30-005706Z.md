---
paths:
  - "src/builtin-modules/**/*.c"
  - "src/lib/**/*.c"
  - "src/globals/**/*.c"
---

# Process-global class IDs need per-runtime `JS_NewClass`

## The gotcha

`JS_NewClassID(&g)` allocates the class id from a process-global counter
([src/quickjs/quickjs.c:1235](src/quickjs/quickjs.c#L1235)) and is
idempotent on already-set globals. `JS_NewClass(rt, id, def)` registers
the class definition (finalizer / gc_mark / call / exotic) into
`rt->class_array[id]` and **must run on every JSRuntime that will ever
host instances of that class.**

The fork's worker thread spawns a new runtime via `JS_NewRuntime()` and
re-runs `quickjs_full_init` on it. Every per-module class init function
must register the class against the **worker's** runtime — not just the
parent's — or the worker's `class_array` will have a missing entry,
indexed past `class_count`. When `free_object` later does
`rt->class_array[p->class_id].finalizer`, that read picks up whatever
bytes happen to live just past the array, and the indirect call jumps
to a wild address → SIGBUS on aarch64 / SIGSEGV on x86_64.

## The buggy pattern

```c
static void init_class(JSContext *ctx) {
    if (g_class_id != 0) return;        // ← BUG
    JS_NewClassID(&g_class_id);
    JS_NewClass(JS_GetRuntime(ctx), g_class_id, &class_def);
    /* ... proto setup ... */
}
```

The `if (g_class_id != 0) return;` early-return looks like a
sensible "already initialized" guard, but `g_class_id` is
process-global — once main has set it, the worker's call no-ops and
the class never gets registered against the worker's runtime.

## The correct pattern (used by `quickjs-encoding`, `quickjs-os`,
`quickjs-context`)

Drop the guard. Let `JS_NewClassID` no-op on the global (it does), let
`JS_NewClass` return -1 silently when the class is already registered
in this runtime
([src/quickjs/quickjs.c:3325-3327](src/quickjs/quickjs.c#L3325-L3327)),
and re-set the proto in the current context. Slight memory churn on
re-init within the same context; no crash.

```c
static void init_class(JSContext *ctx) {
    JS_NewClassID(&g_class_id);
    JS_NewClass(JS_GetRuntime(ctx), g_class_id, &class_def);
    /* proto setup ... */
}
```

## Symptom shape

Crash backtrace looks like:

```
free_object → finalizer = rt->class_array[p->class_id].finalizer  ← bogus pointer
              (*finalizer)(rt, ...)                               ← SIGBUS / SIGSEGV
```

Under gdb, `p->class_id == rt->class_count` is the smoking gun (object's
class index is exactly past the end of the runtime's class array).

## Repro environment

CI failed reliably, local macOS passed by luck (memory just past the
array happened to be NULL there, so `if (finalizer) (*finalizer)(...)`
skipped the call). To repro on this host, use
[meta/ci-in-docker.sh](meta/ci-in-docker.sh) — runs the full `meta/ci.sh`
pipeline inside an Ubuntu 22.04 container that closely mirrors the
GitHub Actions ubuntu-latest environment.
