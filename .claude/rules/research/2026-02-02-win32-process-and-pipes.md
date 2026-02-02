---
paths:
  - "src/builtin-modules/quickjs-libc/**"
  - "tests/create-process.test.ts"
---

# Win32 Process Creation and Pipes

## Win32Handle class (quickjs-libc.c ~line 3223)

Opaque wrapper around a Win32 `HANDLE`. Stores a heap-allocated `HANDLE*`. Finalizer calls `CloseHandle` if the handle is not `INVALID_HANDLE_VALUE`.

- `js_new_win32_handle(ctx, handle)` — wraps a HANDLE
- `js_get_handle(ctx, val)` — extracts HANDLE from Win32Handle or Pointer object
- `js_close_win32_handle(ctx, val)` — closes and marks as INVALID_HANDLE_VALUE to prevent double-close in finalizer

Constructor always throws — Win32Handle objects are only created by native functions.

Registered in `js_os_init` with `JS_NewClassID`, `JS_NewClass`, proto + ctor setup, exported as `"Win32Handle"`.

## CreateProcess (quickjs-libc.c ~line 3359)

`os.CreateProcess(commandLine, options?)` → `{ pid, processHandle, tid, threadHandle }`

Options: `moduleName`, `flags`, `cwd`, `env`, `stdin`, `stdout`, `stderr`.

Stdio redirection: reads HANDLE from stdin/stdout/stderr options via `js_get_handle()`, sets up `STARTUPINFOW` with `STARTF_USESTDHANDLES`, falls back to `GetStdHandle()` for unspecified streams. Sets `inherit_handles = TRUE` when any stdio is redirected.

Uses `CreateProcessW` (Unicode). Environment block built as null-terminated key=value pairs with double-null terminator.

## CreatePipe (quickjs-libc.c ~line 3787)

`os.CreatePipe(options?)` → `{ readEnd, writeEnd }`

Creates anonymous pipe via Win32 `CreatePipe()`. `inheritHandle` option (default true) controls `SECURITY_ATTRIBUTES.bInheritHandle`.

Currently returns Win32Handle objects for both ends.

## ReadFileHandle (quickjs-libc.c ~line 3833)

`os.ReadFileHandle(handle, maxBytes, options?)` — reads from a Win32Handle.

Options: `{ binary: true }` returns ArrayBuffer, otherwise string. Handles `ERROR_BROKEN_PIPE` as EOF (returns empty string/buffer).

## Other Win32 functions

- `WaitForSingleObject(handle, timeoutMs?)` — waits for handle signal, timeout defaults to INFINITE
- `GetExitCodeProcess(handle)` — returns exit code number
- `TerminateProcess(handle, exitCode)` — force-kills process
- `CloseHandle(handle)` — closes Win32Handle (marks invalid) or Pointer handle

## Registration

Win32 functions registered in `js_os_funcs[]` under `#if defined(_WIN32)` (~line 5108).
Constants: `WAIT_OBJECT_0`, `WAIT_ABANDONED`, `WAIT_TIMEOUT`, `WAIT_FAILED`.

## Non-Windows equivalents

- `pipe()` → returns `[read_fd, write_fd]` (raw file descriptors)
- `exec(args, options?)` → accepts `{ stdin: fd, stdout: fd, stderr: fd }` (integer fds)
- Uses `fork()` + `dup2()` + `execve()` for process creation

## Test infrastructure

Tests in `tests/create-process.test.ts` use Wine to run cross-compiled `build/x86_64-pc-windows-static/bin/qjs.exe`.

Cross-compile command: `meta/docker/run-build.sh x86_64-pc-windows-static`

Test command: `npx jest tests/create-process.test.ts --runInBand --forceExit`

Tests filter Wine stderr noise (MoltenVK warnings, fixme messages, hex-prefixed lines, tab-indented lines, blank lines).
