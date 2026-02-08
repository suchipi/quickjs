---
paths:
  - "src/builtin-modules/quickjs-libc/**"
---

# macOS fd Close-After-Fork Issue

## Problem

In `js_os_exec` (quickjs-libc.c), after `fork()` the child process closes all file descriptors >= 3 before calling `exec`. The original code used `sysconf(_SC_OPEN_MAX)` as the upper bound for a close loop:

```c
int fd_max = sysconf(_SC_OPEN_MAX);
for(i = 3; i < fd_max; i++)
    close(i);
```

On macOS, when `ulimit -n` is set to "unlimited", `sysconf(_SC_OPEN_MAX)` returns `9223372036854775807` (LLONG_MAX). This caused the child to enter an effectively infinite loop, calling `close()` on ~9.2 quintillion file descriptors. The child never reached `exec`, so `waitpid` in the parent would block forever.

`getdtablesize()` returns a sane value (10240 on macOS) but still requires iterating over many unused fds.

## Fix

Read `/dev/fd` to enumerate only the actually-open file descriptors in the child process. `/dev/fd` is a virtual filesystem that reflects the calling process's own open fds. After `fork()`, the child inherits copies of the parent's fds, and `/dev/fd` in the child shows exactly that set.

The implementation opens `/dev/fd`, iterates its entries, closes any fd >= 3 (skipping the dirfd used by `opendir` itself), then closes the directory. A bounded fallback (`sysconf` capped at 65536) is used if `/dev/fd` is unavailable.

## Platform availability of /dev/fd

- **macOS**: Always present.
- **Linux**: Present (usually a symlink to `/proc/self/fd`).
- **FreeBSD**: Always present.

## Affected function

`js_os_exec` in quickjs-libc.c (~line 4146, inside `if (pid == 0)` child branch). This code path only exists on non-Windows platforms (`#if !defined(_WIN32)`).
