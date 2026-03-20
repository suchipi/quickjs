---
paths:
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
---

# fork() causes uninterruptible (UE) state on macOS with worker threads

## The Problem

Calling `os.exec` (which uses `fork()` + `exec()`) while an `os.Worker` thread is running can permanently deadlock the forked child on macOS. The child enters the UE (uninterruptible exit) kernel state, which is immune to all signals including SIGKILL. The only way to clear it is a reboot.

## Root Cause

On macOS, `fork()` in a multi-threaded process invokes libc's `pthread_atfork` child handlers. One of these — `_libc_fork_child` — calls `_init_clock_port`, which does a Mach IPC via `host_get_clock_service`. In a forked child of a multi-threaded process, Mach port state is corrupted (ports are per-task, but the child's task is a copy with stale port rights). The `host_get_clock_service` call sends a Mach message that never gets a reply, blocking forever in `mach_msg2_trap` inside the kernel. Since it's a kernel trap (not a userspace syscall), SIGKILL cannot interrupt it.

## Stack trace (from `sample` on a stuck process)

```
fork → _libc_fork_child → _init_clock_port → host_get_clock_service → mach_msg2_trap
```

The child never even reaches the application's post-fork code (dup2, close, chdir, exec). It deadlocks inside `fork()` itself.

## Fix Applied

Replaced `fork()` with a hybrid approach on macOS (`#ifdef __APPLE__`):

- **Common case (no uid/gid)**: `posix_spawn` with `POSIX_SPAWN_CLOEXEC_DEFAULT`. This is kernel-level, never invokes atfork handlers, and atomically closes all non-inherited fds.
- **Rare case (uid/gid specified)**: `vfork()` + `execve()`. `vfork()` does not invoke atfork handlers. Requires all work in the child to be async-signal-safe — PATH resolution and `sysconf(_SC_OPEN_MAX)` are moved to before the `vfork()` call.

Non-macOS platforms keep `fork()` unchanged.

## Constraints for vfork child code

After `vfork()`, the child shares the parent's address space. Only async-signal-safe functions may be called:
- **Safe**: `dup2`, `close`, `chdir`, `setuid`, `setgid`, `execve`, `_exit`
- **NOT safe** (must be done before vfork): `opendir`/`readdir` (use bounded close loop instead), `sysconf`, `getenv` (used by PATH resolution)

## Reproducing

Any script that creates an `os.Worker` and then calls `os.exec` will trigger the bug with the old `fork()` code on macOS. The `test_std.js` test (which presumably does this) was found stuck in UE state during development.
