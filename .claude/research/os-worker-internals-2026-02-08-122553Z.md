---
paths:
  - "src/builtin-modules/quickjs-os/**/*"
  - "src/quickjs-eventloop/**/*"
  - "src/programs/qjs/qjs.c"
  - "tests/*worker*"
  - "tests/fixtures/worker-*/**/*"
---

# os.Worker Internals

## Threading Model

Workers use detached pthreads (`PTHREAD_CREATE_DETACHED`). Each worker gets a fully isolated `JSRuntime` + `JSContext` + module system + event loop. There is no `pthread_join` — completion is signaled by writing to a `worker_done_write_fd` pipe, which the main thread's `select()` loop watches.

Workers are disabled on Windows (`#if !defined(_WIN32)`) — the implementation is entirely pthread-based.

## Key Restrictions

- **No nested workers**: `js_worker_ctor` checks `js_eventloop_is_main_thread(rt)` and throws if called from a worker thread.
- **No `cmdline.exit()` from workers**: Throws `"cmdline.exit can only be called from the main thread"`. Workers cannot terminate the process.
- **Main thread waits for workers**: The main thread's event loop won't exit while `ts->active_worker_count > 0` (fix in commit `be2a692`).

## Message Pipe Architecture

Each worker has two `JSWorkerMessagePipe`s (one per direction). Each pipe contains:
- An atomic `ref_count` (shared between main and worker thread)
- A `pthread_mutex_t` protecting the message queue
- An intrusive linked list of `JSWorkerMessage`s
- A Unix `pipe()` pair (`read_fd`/`write_fd`) used only for signaling (a single byte is written when a message is enqueued to an empty queue, and read when the queue drains)

The signal pipe is what makes `select()` wake up — the actual message data lives in the in-memory queue, not the pipe.

## SharedArrayBuffer Ownership

SABs are the only truly shared memory between threads. Each SAB is prefixed with a `JSSABHeader` containing an atomic `ref_count`. The SAB alloc/free/dup callbacks are registered in `js_eventloop_init()` via `JS_SetSharedArrayBufferFunctions`. When a message containing a SAB is serialized, `JS_WriteObject2` extracts SAB pointers, and the sender manually increments ref counts. The receiver gets the same memory pointer (not a copy). This is fundamentally different from all other message data, which is serialized/deserialized (copied).

## Worker Context Factory

The function that creates a worker's `JSContext` is pluggable via `js_os_set_worker_new_context_func()`. In `qjs.c`, this is set to `JS_NewCustomContext` (lines ~57-75), which calls `quickjs_full_init` to give workers the same builtin modules and globals as the main thread. A different embedding could provide a more restricted context.

## Termination Pattern

Setting `worker.onmessage = null` on either side removes the message handler port from the event loop's `port_list`. On the worker side, if there are no other event sources (timers, FD handlers), the event loop drains and `worker_func` proceeds to cleanup. The cleanup order matters: module system state is freed before the context, which is freed before the event loop, which is freed before the runtime.

## Source Locations

- Worker constructor + message passing: `quickjs-os.c` ~lines 2850-3362
- Event loop poll (watches worker pipes): `quickjs-eventloop.c`, `js_os_poll()`
- Worker context factory registration: `quickjs-eventloop.h`, `js_os_set_worker_new_context_func()`
- `qjs` context factory: `qjs.c`, `JS_NewCustomContext()` ~lines 57-75
