# Be Sparing With Comments

Don't pile on comments. Every comment draws the reader's eye and makes
commented code look more important than the code around it. A long
prose comment in front of a one-liner inverts the visual weight of the
file.

Default to no comment. Add one only when the **why** is non-obvious — a
hidden constraint, a subtle invariant, a workaround for a specific bug.
Don't restate what the code does, don't reference the current task or
caller, don't summarize a function in front of its declaration.

If you reach for a multi-paragraph comment, that usually means the code
needs renaming or restructuring instead.

**Exception: `.d.ts` files.** TSDoc / JSDoc comments on exported API in
`.d.ts` files are user-facing documentation, not internal code
commentary. Those should be thorough — describe params, return values,
edge cases, and link to related symbols. The "be sparing" rule does
NOT apply there.
