---
paths:
  - "meta/build.sh"
  - "meta/ninja/envs/host/msys2.ninja.js"
  - "meta/ninja/envs/target/msys2.ninja.js"
---

# Running MSYS2 Builds from Claude Code's Bash Tool on Windows

## The Gotcha

On a Windows machine where the user typically works in an MSYS2 UCRT64 shell,
Claude Code's `Bash` tool does **not** inherit that environment. The Bash tool
spawns `/usr/bin/bash` — but `/usr/bin/bash` resolves to **Git for Windows'**
bash (`C:/Program Files/Git/usr/bin/bash.exe`), not MSYS2's bash. Symptoms:

- `which node` / `which npm` fail even though they're installed under
  `C:\msys64\ucrt64\bin\`.
- `PATH` contains `/mingw64/bin` (Git Bash's default), not `/ucrt64/bin`.
- `MSYSTEM=MINGW64` even though the user's terminal was UCRT64.
- `/ucrt64` is not a valid mount point — `ls /ucrt64/bin/` reports "No such
  file or directory" even though `C:/msys64/ucrt64/bin/node.exe` exists.
- `meta/build.sh` fails immediately with `npm: command not found`.

Setting `MSYSTEM=UCRT64` and re-invoking `bash --login` from inside the Bash
tool **does not** fix this — that bash is still Git Bash, and Git Bash has no
`/ucrt64` mount regardless of `MSYSTEM`. The `/etc/profile` that reads
`MSYSTEM` lives inside MSYS2, not Git Bash.

## The Fix

Invoke MSYS2's bash by its full Windows-side path and pass `MSYSTEM=UCRT64`
plus `--login` so `/etc/profile` configures the environment, then `cd` to the
repo inside the `-c` string:

```bash
MSYSTEM=UCRT64 /c/msys64/usr/bin/bash --login -c \
  'cd /home/suchipi/Code/quickjs && env QUICKJS_EXTRAS=1 meta/build.sh'
```

- `MSYSTEM=UCRT64` — tells MSYS2's `/etc/profile` which environment to load.
- `--login` — required so `/etc/profile` actually runs (sets `PATH`,
  `PKG_CONFIG_PATH`, etc. for the chosen MSYSTEM). Without `--login`, `PATH`
  is just Git Bash's `PATH` and `which node` still fails.
- `/c/msys64/usr/bin/bash` — bypasses the Git-Bash `/usr/bin/bash` on `PATH`.
- The `cd` inside `-c` is required (see next section).

After the wrapper, `PATH` looks like
`/ucrt64/bin:/usr/local/bin:/usr/bin:/bin:/c/Windows/...`, `which node` finds
`/ucrt64/bin/node`, and the build proceeds.

## CHERE_INVOKING Does Not Work Here

Normally `CHERE_INVOKING=1` makes MSYS2's
`/etc/post-install/05-home-dir.post` (sourced from `/etc/profile`) skip the
`cd $HOME` step. It does NOT work when crossing from Git Bash → MSYS2 bash
via the Bash tool — the variable arrives empty in the MSYS2 child regardless
of how it's passed (inline assignment, `export` before the command, or `env
CHERE_INVOKING=1 ...`).

What's observed: an inline `env`-dump inside the child shows `MSYSTEM` and
Windows-side vars like `PATH`/`SYSTEMDRIVE`/`HOME` arriving, but a freshly
introduced `FOO_BAR=hello` is also dropped — so the filtering is not specific
to `CHERE_INVOKING`. The exact mechanism (Git Bash export behavior vs. MSYS2
runtime env conversion vs. something else) has not been investigated here.

Practical consequence: with `--login`, the post-install script sees no
`CHERE_INVOKING`, `SHLVL` is 1, and it `cd`s to `$HOME`. So the explicit
`cd /home/suchipi/Code/quickjs` inside the `-c '...'` string is required.

## Why You'd Notice

If a `meta/build.sh` invocation through the Bash tool reports
`npm: command not found` on a Windows machine, the user is not missing Node —
the tool is in the wrong shell. Use the wrapper above instead of telling the
user to install something.
