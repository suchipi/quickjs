---
paths:
  - "src/builtin-modules/**/*.c"
  - "src/builtin-modules/**/*.d.ts"
---

# Builtin Module .d.ts Files Must Stay in Sync with C

Each builtin module in `src/builtin-modules/` has a `.c` implementation and a corresponding `.d.ts` file that provides TypeScript type definitions for the module's JS-facing API. When adding, removing, or changing exported functions, constants, or classes in the `.c` file, the `.d.ts` file must be updated to match.

Key conventions for the `.d.ts` files:

- Platform-specific exports that are only present on Windows should be typed as a union with `undefined` (e.g. `number | undefined` for constants, `undefined | ((...) => ...)` for functions).
- Platform-specific exports that are only present on non-Windows platforms follow the same pattern (union with `undefined`).
- Each export should have a JSDoc comment describing its purpose.
- Platform-specific exports should include a `NOTE:` line in their JSDoc indicating which platform(s) they are present on.
- Overloaded functions (e.g. ones that return different types based on an options argument) use an `interface` with multiple call signatures, then export a `var` of that interface type.
