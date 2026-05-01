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

Investigate the failure following `.claude/rules/understand-before-fixing.md` rather than reaching for "it's Wine".
