# Persist Long-Running Command Output to .tmp/

Pipe long-running command output to a file under `.tmp/` instead of running bare and reading only the tail. Re-running a 2-minute test suite to see output you skipped is wasteful — a single run plus persisted log suffices.

```bash
npm test > .tmp/vitest-output.log 2>&1; echo "exit=$?"
```

Then `tail`, `Grep`, or `Read` the log. Same pattern for `meta/build.sh test-platforms` and `src/run-test262/run.sh -u`.

Use plain `>` redirection, NOT `tee` — `tee` is unapproved and pops a permission prompt. `.tmp/` is gitignored per `.claude/rules/use-repo-tmp-dir.md`.
