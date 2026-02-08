---
paths:
  - "src/quickjs-eventloop/**/*"
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
  - "src/builtin-modules/quickjs-timers/quickjs-timers.c"
---

# Event Loop Poll Internals

## Timer Storage

Timers are stored in an **unsorted** linked list (`ts->timers`). Every `js_os_poll` cycle does a linear scan of all timers to find expired ones and compute `min_delay`. There is no priority queue or sorted insertion. This is O(n) per poll where n is the number of active timers.

## One Timer Per Poll

Only ONE timer fires per poll iteration. After calling a timer's handler, `js_os_poll` returns `0` immediately. This means if 5 timers are all ready simultaneously, they fire across 5 separate poll iterations, with `JS_ExecutePendingJob` draining the microtask queue between each. This provides fair interleaving of timer callbacks with promise continuations.

## Timer Dual-Phase Cleanup

Timer cleanup involves two independent mechanisms that must cooperate:

- **Unlink**: `js_timer_unlink` removes the timer from the linked list (sets prev/next to NULL, guards against double-unlink by checking `prev != NULL`)
- **Finalizer**: `js_timer_free` frees the callback JSValue and the struct itself

When a one-shot timer fires, it is unlinked. But it's only freed immediately if `!th->has_object` (no JS-visible Timer wrapper holds a reference). If `has_object` is true, the struct lives until GC collects the wrapper, at which point the finalizer calls `js_timer_free`. This prevents a use-after-free if JS code holds a reference to a timer ID after it fires.

## Duplicated `get_time_ms`

`get_time_ms()` is implemented independently in both `quickjs-os.c` and `quickjs-timers.c`. Both use `clock_gettime(CLOCK_MONOTONIC)` on `__linux__ || __APPLE__` (immune to system clock adjustments) and fall back to `gettimeofday()` on other platforms (susceptible to clock jumps). The duplication means a fix to one must be mirrored to the other.

## Default Select Timeout

When no timers are pending, `min_delay` defaults to 10000ms (10 seconds), not infinity. This is the `select()` timeout. When `active_worker_count > 0` and there are no other event sources, this 10-second timeout prevents the main thread from blocking forever waiting for worker completion — the notification pipe for worker-done is also in the fd set, but the timeout provides a fallback.

## Windows Poll Limitations

The Windows `js_os_poll` implementation (lines ~3382-3450 in quickjs-os.c) only supports watching fd 0 (stdin) via `WaitForSingleObject` on the console handle. There is no `select()`, no arbitrary fd multiplexing. If stdin isn't being watched, it falls back to `Sleep(min_delay)`. This means `os.setReadHandler`/`os.setWriteHandler` on arbitrary fds are effectively Unix-only.

## Worker-Done Batching

When the main thread detects the `worker_done_read_fd` is readable, it reads up to 16 bytes from the pipe. Each byte represents one worker completion, decrementing `active_worker_count` by the number of bytes read. This batches notifications when multiple workers finish nearly simultaneously.

## Event Loop Exit Conditions

`js_os_poll` returns `-1` (causing `js_eventloop_run` to exit) when all of these are true: `rw_handlers` empty, `timers` empty, `port_list` empty, and `active_worker_count <= 0`. On Windows, the check is simpler (just rw_handlers and timers, since workers aren't supported).
