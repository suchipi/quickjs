---
paths:
  - "tests/**/*.test.ts"
  - "**/__snapshots__/**"
---

# Read Snapshot Diffs Before Updating

Never treat `--update` (or `-u`) as the universal answer to any snapshot mismatch. A failing snapshot is a test result; the diff is telling you something. Read it.

For each failing snapshot, classify the diff:

- **Legitimate drift** (hex bytes shifted because a format changed, stack line numbers moved): update is appropriate.
- **Behavior regression** (exit code flipped, stderr now has an error, stdout content lost): update is wrong. Fix the regression.

## Signals it's a regression, not drift

In first-base `cleanResult()` snapshots:

- `code: 0` → `code: 1`
- `stderr: ""` → `stderr: "<error>"`
- `stdout` content gone or replaced

The test's name is a signal too. If a test named "can execute bytecode" now snapshots a failure to execute, the regression is the very thing the test was written to catch.

## How to apply

1. Read each diff. Don't skim.
2. Classify: drift or regression?
3. Update only drift. Fix regressions.

If you can't tell which category, stop and figure it out before running `--update`.
