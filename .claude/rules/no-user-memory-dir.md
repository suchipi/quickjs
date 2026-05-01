# Do Not Use the User-Level Memory Directory

Do NOT save anything to the user-level auto-memory directory (under `~/.claude/projects/<project-slug>/memory/`). Treat that directory as read-only and inert.

All feedback, project context, and other memory-style notes that would normally go there MUST instead be saved as rule files under `.claude/rules/` in this repo, following the conventions in `.claude/rules/claude-rules-conventions.md`.

**Why:** This repo is worked on across multiple different machines. The user-level memory directory lives under `~/.claude/` on a single host and does not sync — anything saved there is invisible from every other machine. Repo-tracked rule files in `.claude/rules/` are committed to the repo and available everywhere the repo is checked out.

## How to apply

- When the auto-memory system would prompt saving a `feedback` / `project` / `user` / `reference` memory, save a rule file in `.claude/rules/` instead.
- If a `MEMORY.md` exists in the user-level memory directory, leave it alone — don't add new entries to it and don't recreate the per-memory files.
- If durable user-specific guidance is learned that doesn't belong in this repo's rules (e.g. preferences that span multiple unrelated projects), surface it to the user and let them decide where it should live, rather than silently writing to the user-level memory dir.
