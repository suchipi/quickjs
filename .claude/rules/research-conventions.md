---
paths:
  - "**/*"
---

# Research Conventions

When researching this codebase, save findings as rule files in `.claude/research/`, following the conventions in `.claude/rules/claude-rules-conventions.md` (Markdown with YAML front matter containing a `paths` array of relevant glob patterns).

**Save proactively, without being reminded.** Whenever a research task is performed, saving the findings to `.claude/research/` is part of the workflow, not an afterthought. The research file IS the deliverable — do not just present findings in chat without creating the file.

Filenames must include the current UTC date and time at the time of creation, so that staleness can be detected later. Use the format `topic-YYYY-MM-DD-HHMMSSZ.md` (topic first, then date, then time with trailing Z to indicate UTC). For example: `some-topic-2026-02-02-153209Z.md`.

Only document findings that would be useful to rediscover quickly in a future session — things like non-obvious gotchas, ownership/lifetime rules, platform-specific quirks, or tricky patterns that aren't self-evident from the code. Don't document a list of what was done (git history covers that), and don't document things that are obvious from reading the relevant code.

## Only Write Verified Facts

Every statement of fact in a research file must be something you have actually verified — by reading the code, running a test, or checking a primary source. Do not write plausible-sounding explanations of *why* something behaves a certain way unless you've confirmed the mechanism. Presenting guesses as truths is actively harmful: future readers (you or another agent) will trust the file, build on top of it, and waste time chasing a fabricated cause.

If you observe a behavior but don't know the mechanism, write down the observation and explicitly say the mechanism is unknown / uninvestigated. "X happens; cause not investigated" is useful. "X happens because of Y" when you didn't check Y is worse than nothing.

## Reading existing research

When gathering information about the codebase, check `.claude/research/` for previously documented findings. These files contain non-obvious gotchas, platform-specific quirks, ownership/lifetime rules, and other details that may save time compared to re-investigating from scratch.
