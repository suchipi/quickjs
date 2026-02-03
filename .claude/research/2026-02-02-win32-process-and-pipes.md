---
paths:
  - "src/builtin-modules/quickjs-libc/**"
  - "tests/create-process.test.ts"
---

# Win32 Process Creation and Pipes

## Win32Handle class (quickjs-libc.c ~line 3189)

Opaque wrapper around a Win32 `HANDLE`. Registered on **all platforms** so that `instanceof Win32Handle` works in JavaScript. On non-Windows, the constructor always throws and no instances are ever created by native code.

The finalizer (calls `CloseHandle`) is only compiled on Windows via `#if defined(_WIN32)`.

- `js_new_win32_handle(ctx, handle)` — wraps a HANDLE (Windows-only)
- `js_get_handle(ctx, val)` — extracts HANDLE from Win32Handle or Pointer object (Windows-only)
- `js_close_win32_handle(ctx, val)` — closes and marks as INVALID_HANDLE_VALUE to prevent double-close in finalizer (Windows-only)

## CreateProcess (Windows-only, quickjs-libc.c ~line 3410)

`os.CreateProcess(commandLine, options?)` → `{ pid, processHandle, tid, threadHandle }`

Options: `moduleName`, `flags`, `cwd`, `env`, `stdin`, `stdout`, `stderr`.

Stdio options accept FILE objects or file descriptors (not Win32Handles). Sets up `STARTUPINFOW` with `STARTF_USESTDHANDLES`, falls back to `GetStdHandle()` for unspecified streams. Sets `inherit_handles = TRUE` when any stdio is redirected.

Uses `CreateProcessW` (Unicode). Environment block built as null-terminated key=value pairs with double-null terminator.

## CreatePipe (Windows-only, quickjs-libc.c ~line 3834)

`os.CreatePipe(options?)` → `{ readEnd, writeEnd }`

Creates anonymous pipe via Win32 `CreatePipe()`. `inheritHandle` option (default true) controls `SECURITY_ATTRIBUTES.bInheritHandle`.

Returns **FILE objects** (not Win32Handles). Converts Windows HANDLEs to CRT file descriptors, then to `FILE*`. Sets `target` property on each to `"pipe:read"` / `"pipe:write"`.

## Cross-platform functions

These functions are available on all platforms with platform-specific implementations:

- `os.exec(args, options?)` — On Windows uses `CreateProcessW` with an internal PID-to-HANDLE map for non-blocking mode. On Unix uses `fork()` + `execve()`. Returns exit code (blocking) or PID (non-blocking). Supports `block`, `file`, `cwd`, `env`, `stdin`/`stdout`/`stderr` options.
- `os.waitpid(pid, options)` — On Windows uses `WaitForSingleObject` on handle from the PID map, encodes exit code as `exit_code << 8` for Unix-compatible status. Supports `WNOHANG`.
- `os.pipe()` → `[read_fd, write_fd]` — On Windows uses `_pipe()` with `_O_BINARY`. Returns integer file descriptors on all platforms.
- `os.kill(pid, sig)` — On Windows uses `TerminateProcess` (looks up handle from PID map, falls back to `OpenProcess`). Signal is interpreted as exit code.
- `os.dup(fd)` / `os.dup2(oldfd, newfd)` — On Windows uses `_dup()` / `_dup2()`.
- `WIFEXITED`, `WEXITSTATUS`, `WIFSIGNALED`, `WTERMSIG`, `WSTOPSIG`, `WIFSTOPPED`, `WIFCONTINUED` — On Windows, processes are always "exited" (no signal concept), so `WIFEXITED` always returns true and `WIFSIGNALED` always returns false.

## Other Windows-only functions

- `WaitForSingleObject(handle, timeoutMs?)` — waits for handle signal, timeout defaults to INFINITE
- `GetExitCodeProcess(handle)` — returns exit code number
- `TerminateProcess(handle, exitCode)` — force-kills process
- `CloseHandle(handle)` — closes Win32Handle (marks invalid) or Pointer handle

Constants: `WAIT_OBJECT_0`, `WAIT_ABANDONED`, `WAIT_TIMEOUT`, `WAIT_FAILED`.

## Test infrastructure

Tests in `tests/create-process.test.ts` use Wine to run cross-compiled `build/x86_64-pc-windows-static/bin/qjs.exe`. Skipped when `CI=true` (Wine not available in CI).

Cross-compile command: `meta/docker/run-build.sh x86_64-pc-windows-static`

Test command: `npx jest tests/create-process.test.ts --runInBand --forceExit`

Tests filter Wine stderr noise (MoltenVK warnings, fixme messages, hex-prefixed lines, tab-indented lines, blank lines).
