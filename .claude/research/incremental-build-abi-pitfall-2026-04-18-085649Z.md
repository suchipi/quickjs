---
paths:
  - src/quickjs/quickjs.h
  - src/quickjs/quickjs.c
  - meta/ninja/rules.ninja.js
  - .claude/upstream-merge/plan.md
---

# Incremental-build ABI pitfall in this repo

**No longer a hazard for routine work** — see "Resolution" below. The diagnostic pattern is still worth keeping because the *symptom* shape (garbage argument values that look like uninitialized memory) tends to recur whenever the build state genuinely gets out of sync, and recognizing it quickly is valuable.

## What used to happen

Ninja's dependency tracking could miss signature/ABI changes to header-declared inline functions in `src/quickjs/quickjs.h`. After changing a function's parameter list (add/remove/reorder) — particularly for functions with inline wrappers defined in the header — some `.o` files got recompiled against the new signature while others remained against the old one. The linker silently merged them; the resulting binary corrupted arguments at runtime.

Symptom we hit (upstream 58f374e port): `JS_SetPropertyInternal` gained a new `this_obj` parameter. The static inline `JS_SetProperty` in the header that calls it was also updated. After an incremental `meta/build.sh`, `quickjs-modulesys.o` was compiled against the old header (wrong caller shape), while `quickjs.o` had the new definition. Binary linked cleanly. At runtime, `this_obj` was read from uninitialized argument registers, producing garbage pointers, and properties silently failed to land on globalThis. Presented as "my port has a bug" for many minutes of debugging before clean rebuild fixed it.

## Resolution

[meta/ninja/rules.ninja.js](../../meta/ninja/rules.ninja.js) `cc_host` / `cc_target` (and `shared_lib_*`) now emit gcc-style depfiles via `-MD -MF $out.d` and tell ninja to consume them via `depfile = $out.d` / `deps = gcc`. Ninja absorbs the depfiles into `build/.ninja_deps` after each compile, so subsequent builds know exactly which headers each `.o` transitively included — including the per-target copied `build/<target>/include/quickjs.h` which downstream `.c` files actually `#include` (the build's `-I` ordering puts `build/include` before `src/quickjs`). Touching a header now correctly cascades into recompiles of every dependent `.o` across every target.

Verify in a debugger-of-the-build-system way: after a fresh build, `ninja -t deps build/intermediate/<some>.target.o` lists every transitive header. A header content change followed by `meta/build.sh` will recompile every `.o` whose deps list that header.

## Diagnostic shape worth remembering

When function arguments come out as garbage (e.g. `this_tag=1073739776`, `this=0x4000`, `flags=0xffffffff`), that's not a logic bug — that's a caller/callee ABI mismatch, with the callee reading past whatever the caller actually pushed. With depfile tracking in place this should no longer arise from header edits, but the pattern can still appear from:

- A `.h` change made *outside* the source tree (e.g. via a patched dependency, a system-header swap, or a build-time-generated header that isn't tracked).
- A toolchain change (compiler upgrade, calling-convention flag flip).
- Manually-edited intermediates under `build/` that ninja doesn't know to invalidate.

In any of those cases, the symptom is the same and `meta/clean.sh && meta/build.sh` remains the fast diagnostic.
