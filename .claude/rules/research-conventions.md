---
paths:
  - "**/*"
---

# Research Conventions

When researching this codebase, save findings as rule files in `.claude/research/`, following the conventions in `.claude/rules/claude-rules-conventions.md` (Markdown with YAML front matter containing a `paths` array of relevant glob patterns).

Filenames must include the current date (YYYY-MM-DD) at the time of creation, so that staleness can be detected later. For example: `2026-02-02-some-topic.md`.

Only document findings that would be useful to rediscover quickly in a future session — things like non-obvious gotchas, ownership/lifetime rules, platform-specific quirks, or tricky patterns that aren't self-evident from the code. Don't document a list of what was done (git history covers that), and don't document things that are obvious from reading the relevant code.
