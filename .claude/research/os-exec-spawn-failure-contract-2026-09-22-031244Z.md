---
paths:
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
  - "src/builtin-modules/quickjs-os/quickjs-os.d.ts"
  - "tests/os-exec.test.ts"
  - "tests/create-process.test.ts"
---

# os.exec: How "Couldn't Start the Program" Is Reported

When `os.exec` can't start the program, every platform throws a plain `Error` shaped like `os.open`'s errors: the message is `"<strerror> (errno = N, <option> = <value>)"`, with an `errno` property plus one property named after the `os.exec` option that caused the failure (`file`, `cwd`, `stdin`/`stdout`/`stderr`, `uid`, `gid`). There's no option property when no process could be created at all (fork/vfork `EAGAIN`, pipe creation failure, Windows out of memory). On Windows every one of these errors also has a `win32Error` property, repeated at the end of the message, holding `CreateProcessW`'s `GetLastError()` code; codes with no errno equivalent get `errno` `EINVAL`. `block: false` throws the same way, and no child is left behind. A program that runs and exits 127 just returns 127.

## How Each Path Finds the Cause

| Path | Used when | How the cause reaches the parent |
| --- | --- | --- |
| `fork()` + exec | every non-Apple unix | child writes `{culprit, errno}` to a `pipe2(O_CLOEXEC)` pipe and `_exit(127)`s; a successful exec closes the write end, so the parent reads EOF |
| `posix_spawn` | macOS without `uid`/`gid` | `posix_spawn` returns the errno itself; the parent works out the culprit (`EBADF` means a stdio fd, else checks whether the `cwd` is usable, else `file`) |
| `vfork()` + exec | macOS with `uid`/`gid`, or `cwd` on macOS < 10.15 | same pipe as the fork path, created with `pipe()` + `fcntl(FD_CLOEXEC)` |
| `CreateProcessW` | Windows | `GetLastError()` mapped to an errno; `GetFileAttributesW` on the cwd decides whether the cwd was the cause (and then supplies the errno, while `win32Error` stays `CreateProcessW`'s code: 267 `ERROR_DIRECTORY` under wine for a missing cwd) |

Remapped stdio fds are checked with `fcntl(F_GETFD)` before any of this, on every unix path.

## Gotchas (verified)

- macOS `vfork()` does not run `pthread_atfork` handlers (unlike `fork()`), but on Darwin 25.0.0 it also doesn't share memory with the parent or suspend it: a child's write to a parent variable isn't visible, and `vfork()` returns in the parent before the child execs. So shared-memory or non-blocking-read error reporting doesn't work there; the parent has to block on the pipe until EOF or a report.
- The macOS SDK has no `pipe2`, so the macOS pipe gets `FD_CLOEXEC` in a second step. By pipe semantics, a thread that forks without closing fds between those two steps would inherit the write end and delay the parent's read until that process exits (not reproduced).
- The report pipe's write end must not be fd 0-2, or the child's `dup2()` onto stdio would replace it (the code moves it with `F_DUPFD_CLOEXEC`). It must also be skipped by the child's close-all-fds loops.
- The stdio fds are validated before the pipe is created. Otherwise a closed fd number passed as `stdout` could be reused for the pipe, and the child would `dup2()` the pipe onto its stdout.
- macOS `posix_spawn` returns `ENOENT` for a missing `cwd` and for a missing program alike, so the error alone can't say which it was.
- After a failed macOS `posix_spawn`, `waitpid(-1, WNOHANG)` briefly reports a running child. It's gone within 10ms, and a blocking `waitpid(-1, 0)` reports `ECHILD` in every run tried. The 0.16.2 binary behaves the same, so tests must not use `WNOHANG` to check for leftover children.
- `strerror` text differs between libcs: musl says "No child process" where glibc and macOS say "No child processes". The strings used by the exec errors ("No such file or directory", "Permission denied", "Not a directory", "Bad file descriptor", "Operation not permitted") matched on macOS, glibc and musl; on Windows only "No such file or directory" has been checked.
- glibc 2.31's `posix_spawnp` on Linux also returns `ENOENT`/`EACCES` synchronously, so the platforms only differed because of how each path was implemented.

## Where This Was Run

- macOS (Darwin 25.0.0, arm64): `tests/os-exec.test.ts`, plus manual checks of the `vfork` path, a failure while a Worker runs, and fd leaks.
- Linux aarch64 in Docker: `tests/os-exec.test.ts`, `os-module.test.ts` and `worker-stress.test.ts` with the glibc and static (musl) builds; manual checks with the dynamic musl build in Alpine, including a `fork()` failure forced with `RLIMIT_NPROC=1`.
- Windows under wine: the `os.exec` tests in `tests/create-process.test.ts` (missing program, missing cwd, error names the program actually spawned). Wine returned `ERROR_FILE_NOT_FOUND` (2) for a directory, a text file, an empty `.exe` and a name with `<>`, so the unmapped-code (`EINVAL`) path hasn't been run.
- FreeBSD (aarch64, x86_64) and x86_64 glibc: compiled only. Emscripten, Cosmopolitan, x86_64 musl/static and the darwin cross builds: not built.

## History

- Until the commit which created this file, the fork path returned 127 silently for every failure after `fork()`, the macOS `posix_spawn` path threw `TypeError: posix_spawn error: <strerror>`, and the macOS `vfork` path threw `command not found: <name>` / `command not executable: <name>`. The macOS throws came from `a4463cb` (the macOS fork deadlock fix, first released in 0.12.1). Before that, macOS used the fork path too.
- Upstream `bellard/quickjs` (checked at `04be246`) only has the fork path with `_exit(127)`.
