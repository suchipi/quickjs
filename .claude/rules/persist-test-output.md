# Persist Long-Running Command Output to .tmp/

Persist the output of long-running commands (especially `npm test`, which takes ~2 min here) to a file under `.tmp/` rather than running them bare and only reading the tail. If you miss details in the first read, you can re-read the saved file instead of re-running the whole suite.

Re-running a 2-minute test suite just to see output you skipped is wasteful — a single run plus persisted log suffices.

## How to apply

- `npm test > .tmp/vitest-output.log 2>&1; echo "exit=$?"` then `tail`, `Grep`, or `Read` the log.
- **Use plain shell redirection (`>`), NOT `tee`.** `tee` requires write permission and pops a permission prompt; `>` doesn't.
- Same pattern for `meta/build.sh test-platforms` and `src/run-test262/run.sh -u` — both long.
- `.tmp/` is already gitignored per `.claude/rules/use-repo-tmp-dir.md`.
- Only re-run the suite when an actual change has been made that could affect results.
