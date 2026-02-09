---
paths:
  - "**/*"
---

# Do Not Blindly Blame Wine for Test Failures

When tests fail that involve Windows binaries run through Wine, DO NOT assume it's a "Wine environment setup issue" or "Wine configuration problem" without investigating.

Wine is a mature, stable compatibility layer. If a test fails under Wine, it's usually because:

- The code has a real bug
- The test expectations are wrong
- There's a genuine platform difference that needs handling

Always investigate test failures by:

1. Reading the actual error message
2. Examining what the test expects vs what it got
3. Looking at the relevant code
4. Testing the code directly (not just through the test framework)
