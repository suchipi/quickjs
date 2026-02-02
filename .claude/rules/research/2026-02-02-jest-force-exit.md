---
paths:
  - "tests/**"
---

# Jest --forceExit Flag

When Claude runs tests with Jest in this codebase, the `--forceExit` flag is required. Without it, Jest hangs after tests complete. This issue only occurs when Jest is run by Claude; it does not affect human-initiated test runs.

Example:

```bash
npx jest tests/create-process.test.ts --runInBand --forceExit
```
