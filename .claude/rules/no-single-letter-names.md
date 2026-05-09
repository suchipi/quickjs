---
paths:
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mjs"
  - "**/*.cjs"
---

# Avoid Single-Character Variable Names in JS/TS

Don't introduce single-letter identifiers (`f`, `m`, `x`, `e`, `i`,
etc.) for variables, parameters, or helpers in JavaScript or
TypeScript files. They make code harder to grep, harder to read, and
harder for the next person (or future you) to understand at a glance.

This applies to *every* binding — including loop indices and
short-lived callback parameters. Use a name that says what the thing
is.

- `for (let index = 0; index < length; index++)` instead of
  `for (let i = 0; i < n; i++)`.
- `array.map((item) => …)` instead of `array.map((x) => …)`.
- `.catch((error) => …)` instead of `.catch((e) => …)`.
- `fixturePath` instead of `f`. `module` or `imported` instead of `m`.

If a name *might* be unclear, it is. Spell it out.

## How to apply

- New code: pick a descriptive name from the start.
- Touching existing code: if you're already editing the line, rename
  while you're there. Don't rename unrelated code just to fix this.
