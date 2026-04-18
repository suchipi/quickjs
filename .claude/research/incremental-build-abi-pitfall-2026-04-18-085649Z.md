---
paths:
  - src/quickjs/quickjs.h
  - src/quickjs/quickjs.c
  - meta/build.sh
  - .claude/upstream-merge/plan.md
---

# Incremental-build ABI pitfall in this repo

Ninja's dependency tracking can miss signature/ABI changes to header-declared inline functions in `src/quickjs/quickjs.h`. After changing a function's parameter list (add/remove/reorder) — particularly for functions with inline wrappers defined in the header — some `.o` files get recompiled against the new signature while others remain against the old one. The linker silently merges them; the resulting binary corrupts arguments at runtime.

Symptom we hit (upstream 58f374e port): `JS_SetPropertyInternal` gained a new `this_obj` parameter. The static inline `JS_SetProperty` in the header that calls it was also updated. After an incremental `meta/build.sh`, `quickjs-modulesys.o` was compiled against the old header (wrong caller shape), while `quickjs.o` had the new definition. Binary linked cleanly. At runtime, `this_obj` was read from uninitialized argument registers, producing garbage pointers, and properties silently failed to land on globalThis. Presented as "my port has a bug" for many minutes of debugging before clean rebuild fixed it.

**Fix**: always `meta/clean.sh` before `meta/build.sh` after any change to function signatures in `quickjs.h` (or really, anything header-level in `src/quickjs/`). This is now codified in [.claude/upstream-merge/plan.md](../../.claude/upstream-merge/plan.md) for upstream-merge PORT verification.

Diagnostic that unlocked it: when args come out as garbage (e.g. `this_tag=1073739776`, `this=0x4000`, `flags=0xffffffff`), that's not a logic bug — that's caller/callee ABI mismatch reading past the arguments the caller actually pushed.
