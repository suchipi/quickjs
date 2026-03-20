# Unattended Research Task Guide

This document explains how unattended research tasks work in this repo, so a fresh Claude session can get up to speed quickly.

## What is an unattended research task?

The user gives you a research question or investigation task, then goes away (e.g. overnight). You research the codebase autonomously and produce a written deliverable. The user reviews your findings when they return.

## Deliverable

The user will tell you whether the deliverable is:
- A **research file** in `.claude/research/` (for investigations), or
- A **plan** (for implementation tasks the user wants to review before executing)

If they don't specify, ask before starting.

## Key constraint: no permission prompts

If you trigger a permission prompt, work halts until the user returns — potentially wasting hours. Everything you do must be pre-approved in `.claude/settings.local.json`. The rules in `.claude/rules/` codify what you can and cannot do.

## What you CAN do

- **Read/search the codebase**: `Read`, `Glob`, `Grep` tools (scoped to the repo, `/usr/`, `/opt/`, `/bin/`, `/Library/Developer/`)
- **Inspect git history**: `git log`, `git blame`, `git diff`, `git show`, `git status`, `git shortlog`, `git rev-parse`, etc.
- **Inspect binaries**: `nm`, `objdump`, `strings`, `xxd`, `hexdump`, `file`
- **File metadata**: `stat`, `du`, `wc`, `tree`, `which`, `type`, `ls`
- **Spawn subagents**: Use the `Agent` tool (especially `subagent_type=Explore`) for parallel research
- **Write findings**: `Write` to `.claude/research/**`

## What you CANNOT do

- **Git mutations** — no commits, pushes, merges, rebases, checkouts, etc. (`.claude/rules/no-git-mutations.md`)
- **Change dependencies** — no `npm install <pkg>`, no editing package.json deps (`.claude/rules/no-dependency-changes.md`)
- **Modify Claude's own instructions** — no changes to `CLAUDE.md`, `.claude/rules/`, `.claude/settings*.json` (`.claude/rules/no-self-modification.md`)
- **Use unapproved shell commands** — no `find`, `sed`, `awk`, `echo`, `grep` (use dedicated tools instead) (`.claude/rules/use-approved-tools-only.md`)
- **Read files outside approved directories** — permissions are scoped to protect the user's personal files
- **Use `/tmp`** — use `.tmp/` in the repo root instead (`.claude/rules/use-repo-tmp-dir.md`)

## Research file format

When the deliverable is a research file, follow `.claude/rules/research-conventions.md`:
- Filename: `topic-YYYY-MM-DD-HHMMSSZ.md` (UTC timestamp)
- Content: non-obvious findings, gotchas, quirks — not a log of what you did
- The research file IS the deliverable

## Tips

- Use `Agent` with `subagent_type=Explore` for broad codebase exploration
- Launch multiple agents in parallel for independent questions
- You cannot detect permission prompts — they silently block until the user returns. Avoid them entirely by only using pre-approved tools and commands.
- The build system, test infrastructure, and source architecture are documented in `CLAUDE.md`
