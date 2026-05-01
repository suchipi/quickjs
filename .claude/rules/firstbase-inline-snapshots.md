---
paths:
  - "tests/**/*.test.ts"
---

# Prefer Inline Snapshots for first-base Spawn Tests

When writing vitest tests that spawn a binary via `first-base`'s `spawn(...)`, assert on the whole `cleanResult()` object with `toMatchInlineSnapshot` rather than pulling `.code`, `.stderr`, `.stdout` out individually and asserting each with `toBe` / `toMatch`.

A single inline snapshot shows all four fields (code, error, stdout, stderr) in the diff when something changes. Debugging a failure means seeing at a glance what the actual exit status / stdout / stderr were — not chasing down three separate assertion failures that only report one field each.

## How to apply

- Default to `expect(run.cleanResult()).toMatchInlineSnapshot(...)` for any first-base spawn assertion.
- The default sanitizers normalize `<rootDir>` and stack frames to `at somewhere`, so paths are stable across developer machines without extra work — there's usually no need to reach for regex matching.
- Only fall back to `toMatch` / individual-field assertions when the output genuinely isn't snapshottable (e.g. contains timestamps or other per-run entropy not covered by the default sanitizers). In those cases, add a custom sanitizer rather than abandoning inline snapshots.
