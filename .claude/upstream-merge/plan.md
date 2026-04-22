# Upstream Catch-Up Protocol

## Context

GitHub reports `suchipi/quickjs@main` as **777 ahead / 428 behind** `bellard/quickjs@master`. The divergence dates back to the merge base `2788d71` ("updated to Unicode 14.0.0", Oct 2021). Over those 428 upstream commits, upstream keeps fixing bugs (regex, TypedArrays, async generators, etc.) and adding features (JSON modules, RegExp.escape, Iterator.prototype.map, JSON.parse source text, …) that would be valuable in this fork, but the fork has reorganized the source tree so diffs can't be applied blindly:

| Upstream path              | Fork path                                  |
|----------------------------|--------------------------------------------|
| `quickjs.c` / `quickjs.h` / `quickjs-atom.h` / `quickjs-opcode.h` | [src/quickjs/](src/quickjs/) (fork also has a `quickjs.d.ts` here — fork-added, ignore when porting) |
| `libregexp.c`, `libregexp-opcode.h`, `libregexp.h` | [src/lib/libregexp/](src/lib/libregexp/)   |
| `libunicode.c`, `libunicode.h`, `libunicode-table.h` | [src/lib/encoding/libunicode/](src/lib/encoding/libunicode/) |
| `cutils.c`, `cutils.h`     | [src/lib/cutils/](src/lib/cutils/)         |
| `libbf.c`, `libbf.h`       | [src/lib/libbf/](src/lib/libbf/)           |
| `list.h`                   | [src/lib/list/list.h](src/lib/list/list.h) |
| `dtoa.c`, `dtoa.h`         | does not yet exist in fork (added upstream in `9936606`). When that commit is processed, create [src/lib/dtoa/](src/lib/dtoa/) mirroring the `libbf` / `libregexp` layout (plus a `dtoa.ninja.js`), and wire it into whatever consumes it in `quickjs.c`. |
| `qjs.c`                    | [src/programs/qjs/qjs.c](src/programs/qjs/qjs.c) |
| `qjsc.c`                   | [src/programs/qjsc/qjsc.c](src/programs/qjsc/qjsc.c) |
| `quickjs-libc.c` / `.h`    | split across [src/builtin-modules/quickjs-os/](src/builtin-modules/quickjs-os/), [src/builtin-modules/quickjs-std/](src/builtin-modules/quickjs-std/), and [src/quickjs-eventloop/](src/quickjs-eventloop/) |
| `test262.conf`, `test262_errors.txt`, `test262o.conf`, `run-test262.c` | [src/run-test262/](src/run-test262/) |
| `unicode_download.sh`      | [src/lib/encoding/libunicode/downloaded/unicode_download.sh](src/lib/encoding/libunicode/downloaded/unicode_download.sh) |
| `unicode_gen.c`, `unicode_gen_def.h` | [src/lib/encoding/libunicode/](src/lib/encoding/libunicode/) |
| `Makefile`                 | no longer exists — replaced by Ninja/`meta/` build |
| `Changelog`, `VERSION`, `TODO` | no longer tracked (fork uses [todo.txt](todo.txt)) |
| `fuzz/**`, `examples/**`, `doc/**` | not vendored — skip |

Goal: walk every commit in `2788d71..upstream/master` oldest-first, bring each one into the fork in a way that's appropriate, and leave behind enough git ancestry for GitHub to report the fork as no longer behind.

The work is expected to span many sessions. The protocol must be resumable and statelessly tell us "what's next?" without any out-of-band notes.

## Decisions (from user)

- **Work branch:** directly on `main`.
- **Ancestry markers:** one `git merge -s ours <sha>` per processed upstream commit (≈428 merge commits total).
- **Tracking:** committed tracking file at [upstream-merge-status.md](../../upstream-merge-status.md) — one row per upstream sha with status + notes. Merge commit messages also carry the status for redundancy, but the tracking file is the canonical source.

## Protocol

### 0. Prep (one-time)

```
git fetch upstream
```

`upstream/master` should resolve to `d7ae12a` (or newer if upstream advances). The merge base with main is `2788d71`.

Copy this approved plan file into the repo so future sessions can read it without consulting `~/.claude/plans/`:

```
cp ~/.claude/plans/on-github-it-says-rustling-cake.md .claude/upstream-merge/plan.md
```

Create [upstream-merge-status.md](../../upstream-merge-status.md), seeded with every upstream commit oldest-first:

```
git log --reverse --pretty='| %h | PENDING | %s |  |' 2788d71..upstream/master
```

Paste the output under a markdown table header:

```
# Upstream Merge Status

Rows ordered oldest → newest. Status is one of: PENDING, PORT, SKIP-NA, SKIP-DONE, SKIP-BAD.

| Short SHA | Status | Subject | Notes |
|-----------|--------|---------|-------|
| <seeded rows> |
```

Commit both [.claude/upstream-merge/plan.md](.claude/upstream-merge/plan.md) and [upstream-merge-status.md](../../upstream-merge-status.md) together as the initial setup commit. If upstream advances during the project, append new rows at the bottom of `upstream-merge-status.md` as needed.

### 1. Pick the next commit

"Next" = the first row in [upstream-merge-status.md](../../upstream-merge-status.md) still marked `PENDING`. Cross-check against git ancestry — these should agree:

```
git rev-list --reverse main..upstream/master | head -1
```

Because each completed commit is marked via `git merge -s ours <sha>`, it becomes an ancestor of main and drops out of this list. If the tracking file and `git rev-list` disagree, trust `git rev-list` and fix the tracking file.

Sanity-check progress at any time with:
```
git rev-list --count main..upstream/master   # remaining
git rev-list --count 2788d71..upstream/master # total (428)
```

### 2. Classify the commit

Run `git show --stat <sha>` then `git show <sha>` to inspect. Bin into one of:

- **PORT** — real code/test change that should exist in the fork. Proceed to step 3a.
- **SKIP-NA** — not applicable to this fork (Makefile edits, Changelog entries, fuzz harness tweaks, VERSION bumps, things touching files we've deleted). Proceed to step 3b.
- **SKIP-DONE** — change is already present (fork pre-ported it, or a later commit on main already covered it). Verify by reading the current fork code. Proceed to step 3b.
- **SKIP-BAD** — change is actively undesirable (e.g. reverts something the fork intentionally kept). Proceed to step 3b.

### 3a. PORT path

Try auto-apply first when the commit touches files that all map into one fork directory:

```
git show <sha> > .tmp/upstream.patch            # repo-root .tmp is gitignored
git apply --3way --directory=<fork-dir> .tmp/upstream.patch
```

Examples:
- commit touches only `quickjs.c`/`quickjs.h`/`quickjs-atom.h`/`quickjs-opcode.h` → `--directory=src/quickjs`
- commit touches only `libregexp.*` → `--directory=src/lib/libregexp`
- commit touches only `libunicode*` → `--directory=src/lib/encoding/libunicode`
- commit touches only `cutils.*` → `--directory=src/lib/cutils`

If the commit spans multiple fork directories, split it: extract per-path hunks with `git show <sha> -- <path>` and apply each with the matching `--directory`.

If `git apply --3way` rejects hunks (expected for `quickjs.c` — it's diverged heavily), resolve manually: open the reject file, read the surrounding context in the fork, and port the change by hand. Respect `.claude/rules/understand-before-fixing.md` — read enough of the fork code to know *why* the upstream change exists before transcribing it.

**Whitespace differences.** The fork enforces `trim_trailing_whitespace = true` via [.editorconfig](.editorconfig); upstream does not. Many upstream hunks will be accompanied by trailing-whitespace noise (on added lines, context lines, or elsewhere in the file), and `git apply` in strict mode will reject those. Defuse this with `--whitespace=fix` and `--ignore-whitespace`:

```
git apply --3way --directory=<fork-dir> --whitespace=fix --ignore-whitespace .tmp/upstream.patch
```

`--whitespace=fix` silently strips trailing whitespace from the patch as it applies (so new lines land already-clean, matching fork convention). `--ignore-whitespace` prevents rejection purely on whitespace-only mismatches in context lines. Manual ports of rejected hunks should also strip trailing whitespace from any pasted upstream lines before committing.

If a commit is *only* whitespace (e.g. upstream normalizing indentation), classify it as SKIP-DONE when the fork's `.editorconfig` already enforces the desired shape, with a note pointing to that.

Special case — **`quickjs-libc.c`**: decide per-hunk which of `quickjs-os` / `quickjs-std` / `quickjs-eventloop` it belongs in based on what symbol/area the hunk touches.

Update the row in [upstream-merge-status.md](../../upstream-merge-status.md) for this sha: change Status from `PENDING` to `PORT` and fill in the Notes column with a short human-readable description of what was ported (not a sha — the tracking change lives in the same commit as the port, so "the port commit" self-references). Then commit port work + tracking update together:
```
git add <paths> upstream-merge-status.md
git commit -m "port upstream <short-sha>: <upstream subject line>

upstream: <full-sha>
"
```

**You MUST build and run the full test suite after every PORT commit.** Do not skip this step or defer it.

```
env QUICKJS_EXTRAS=1 meta/build.sh test-platforms
npm test
src/run-test262/run.sh -u
```

**Incremental build by default; clean only on failure.** Start with an incremental `meta/build.sh test-platforms`. If the build or tests fail, re-run with `meta/clean.sh` first and try again before digging into the port — Ninja's incremental build can miss ABI changes in `quickjs.h` (e.g. when a port adds/removes/reorders parameters on a function whose inline wrapper is in the header), leaving some `.o` files linked against the old signature and others against the new one. The resulting binary link-silently-succeeds but corrupts arguments at runtime, producing bizarre crashes that look like logic bugs in the port. If a clean rebuild makes the failure go away, that was the cause; if the failure persists, it's a real issue in the port.

All three must be green before proceeding. For test262, `-u` updates the error file; if `git diff src/run-test262/test262_errors.txt` shows changes, either the port fixed tests (good — include the updated error file in the commit) or broke tests (bad — fix before proceeding). If either fails, fix it before the port commit is finalized (amending or adding follow-up commits is fine, as long as everything is green before step 5's merge marker lands). Then mark merged (step 5).

### 3b. SKIP paths

No code changes. Go straight to step 4.

### 4. Update tracking file (SKIP rows only)

For PORT rows, the tracking update is bundled into the port commit in step 3a — nothing extra to do here.

For SKIP-* rows, update the row in [upstream-merge-status.md](../../upstream-merge-status.md): Status → `SKIP-NA` / `SKIP-DONE` / `SKIP-BAD`, Notes → one-line reason. Commit it as a tracking-file-only commit:

```
git add upstream-merge-status.md
git commit -m "mark upstream <short-sha>: <SKIP-*> — <reason>"
```

### 5. Record ancestry

Single merge commit per upstream sha. The same status+notes goes into the merge message (duplicating the tracking file, so `git log` alone is still readable):

```
git merge -s ours --no-ff <sha> -m "upstream <short-sha>: <PORT|SKIP-NA|SKIP-DONE|SKIP-BAD> — <upstream subject>

<one-line reason / pointer to port commit / why-skipped>
"
```

Examples:
- `upstream 46bd985: PORT — fixed buffer overflow in Atomics with resizable typed arrays\n\nPorted in <fork-sha>.`
- `upstream <sha>: SKIP-NA — Makefile tweak\n\nMakefile only; fork uses the Ninja/meta build system and does not vendor Makefile.`
- `upstream 2bc4159: SKIP-DONE — TypedArray DefineOwnProperty cleanup\n\nAlready implemented in fork commit 2bc4159 (same subject).`

The `--no-ff` is defensive; `-s ours` already forces a merge commit, but being explicit keeps fast-forwards from creeping in if someone re-runs a step.

Commit sequence recap:
- **PORT:** one commit containing port work + tracking file update, then the merge marker.
- **SKIP-*:** one commit containing only the tracking file update, then the merge marker.

### 6. Loop

Go to step 1 until `git rev-list main..upstream/master` is empty. The final marker's second parent will be `upstream/master` itself, so GitHub's "behind" counter hits 0.

## Resumability

A new session can reconstruct everything from the tracking file, with git as the source of truth if they disagree:

- **What's next?** → first `PENDING` row in [upstream-merge-status.md](../../upstream-merge-status.md). Confirm with `git rev-list --reverse main..upstream/master | head -1`.
- **What's been done, and how?** → read [upstream-merge-status.md](../../upstream-merge-status.md); or `git log --merges --grep='^upstream ' main` for the git-log view.
- **Why was commit X skipped?** → the Notes column in the tracking file, or `git log --merges --grep='upstream <short-sha>' -1 main`.

If the tracking file shows a commit as done but `git rev-list` still lists it as behind (or vice versa), the git ancestry is authoritative — re-do whichever side is out of sync.

## Useful commands

```
# list remaining upstream commits oldest-first with subjects
git log --reverse --oneline main..upstream/master

# inspect a single upstream commit
git show --stat <sha>
git show <sha>

# show only a specific upstream file's changes for a commit
git show <sha> -- quickjs.c

# see already-processed upstream commits with reasons
git log --merges --grep='^upstream ' --pretty='%H %s' main
```

## Verification

- After every PORT: full build (covering Windows / WASM targets), full test suite, and test262 must pass — `env QUICKJS_EXTRAS=1 meta/build.sh test-platforms`, then `npm test`, then `src/run-test262/run.sh -u`. Run incremental by default; only run `meta/clean.sh` first if the build or tests fail (incremental builds can miss header-level ABI changes — a clean rebuild is the fast diagnostic). No commit lands with red tests. This step is mandatory; never skip it.
- When done, GitHub's compare page should report `suchipi/quickjs@main` as 0 behind `bellard/quickjs@master`. Locally: `git rev-list --count main..upstream/master` returns `0`.

## When in doubt, ask

If anything about handling a given upstream commit is ambiguous — which category it falls into, where a new API belongs in the fork's module split, whether a behavior change conflicts with a deliberate fork choice, how to adapt an upstream C-style signature into a JS-idiomatic one, whether a whitespace-heavy diff is meaningful, etc. — **stop and ask the user** before making the call. Do not silently pick a direction on ambiguous commits; the cost of asking is low and the cost of quietly cementing the wrong choice 400 times is high.

## Non-negotiables

**Preserve the fork's identity.** Do not reshape the fork toward upstream's structure to make this merge easier. Specifically:

- Do **not** flatten [src/](src/) back to the upstream-style root layout.
- Do **not** recombine the `quickjs-os` / `quickjs-std` / `quickjs-eventloop` split back into a single `quickjs-libc`.
- Do **not** replace the Ninja/[meta/](meta/) build with a Makefile, even partially.
- Do **not** remove fork-added files (like `quickjs.d.ts`, the `quickjs-*` builtin modules, [src/globals/](src/globals/), etc.) to reduce diff surface.
- Do **not** rename fork-level identifiers to match upstream's if the fork deliberately renamed them.

The divergence is a feature, not a bug. The port work adapts upstream changes into the fork's shape; the fork's shape does not bend back to upstream's.

**Keep fork API signatures idiomatic to JS.** The fork has rewritten many `quickjs:std` / `quickjs:os` APIs to be JS-idiomatic — e.g. throwing `Error` objects instead of returning errno integers, returning `Promise`s / structured objects instead of pairs, using options objects instead of positional flags, etc. When porting an upstream change:

- If upstream adds a new API, port it but **adapt** the signature to the fork's JS-idiomatic style (throw on error, return proper types, named options). Update the relevant `.d.ts` to document the JS-facing shape, not upstream's C-facing shape.
- If upstream *modifies* an existing fork-adapted API, apply the underlying behavior change but keep the fork's signature. Do **not** regress a JS-idiomatic signature back to a C-style signature to match upstream.
- If the change is purely C-style error-handling plumbing that the fork already handles differently, that's often a SKIP-DONE.

**Keep `.d.ts` files in sync with what you port.** The `.d.ts` files ([src/quickjs/quickjs.d.ts](src/quickjs/quickjs.d.ts) and the per-module ones under [src/builtin-modules/](src/builtin-modules/)) are fork-added and upstream has no equivalent, so no diff will touch them. When a PORT adds/removes/changes an exported API, update the `.d.ts` corresponding to the `.c`/module the API was added to — as part of the same PORT commit.

## Out of scope / not part of this protocol

- Cleaning up the `upstream-master` local branch (it looks like a stale prior attempt; leave it alone unless the user wants it pruned).
- Removing the `pull in upstream changes` line from [todo.txt](todo.txt) — do that when the process finishes, not now.
- Any interactive rebase or history rewrite of main. The whole design relies on merge commits being append-only.
