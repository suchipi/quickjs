---
paths:
  - "**/*"
---

# Research Conventions

When researching this codebase, save findings as rule files in `.claude/research/`, following the conventions in `.claude/rules/claude-rules-conventions.md` (Markdown with YAML front matter containing a `paths` array of relevant glob patterns).

**Save proactively, without being reminded.** Whenever a research task is performed, saving the findings to `.claude/research/` is part of the workflow, not an afterthought. The research file IS the deliverable — do not just present findings in chat without creating the file.

Filenames must include the current UTC date and time at the time of creation, so that staleness can be detected later. Use the format `topic-YYYY-MM-DD-HHMMSSZ.md` (topic first, then date, then time with trailing Z to indicate UTC). For example: `some-topic-2026-02-02-153209Z.md`.

Only document findings that would be useful to rediscover quickly in a future session — things like non-obvious gotchas, ownership/lifetime rules, platform-specific quirks, or tricky patterns that aren't self-evident from the code. Don't document a list of what was done (git history covers that), and don't document things that are obvious from reading the relevant code.
