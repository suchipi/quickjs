---
paths:
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
  - "src/quickjs-eventloop/quickjs-eventloop.c"
  - "tests/worker-initial-data.test.ts"
---

# Worker that exits without parent terminate() must close its send_pipe, or the parent hangs

## The bug (fixed 2026-06-13)

A `new Worker(...)` whose entry module fails to load (missing file, `undefined` filename, syntax error before any code runs) while the parent has `.onmessage` set but NO `.onerror` would hang the parent process forever (the parent's `qjs` never exits). With `.onerror` set it was fine, because the onerror handler called `w.terminate()`, which closes the pipe.

Root cause: the parent's event loop (`js_os_poll`) only exits when `rw_handlers`, `timers`, AND `port_list` are all empty and `active_worker_count <= 0`. Setting `worker.onmessage = fn` adds an entry to `port_list` backed by the worker's send pipe. That port is only reaped when its pipe is `closed` AND drained (see the reap blocks near the top of both `js_os_poll` variants). On the worker-exit path in `worker_func`, the worker closed its **error** pipe (`ts->error_send_pipe->closed = 1`) but NOT its **send** pipe (`ts->send_pipe`), so the parent's onmessage port lingered forever and `port_list` was never empty -> infinite poll.

The fix: in `worker_func`, after `js_eventloop_run` returns, also mark `ts->send_pipe->closed = 1` and signal its waker, mirroring the existing error-pipe close. `terminate()` / `onmessage=null` closes this same pipe from the PARENT side (`js_worker_set_onmessage`, `ps->closed = 1` on `worker->send_pipe`); the new code closes it from the WORKER side for the case where the parent never calls terminate().

## Why it's safe (verified)

- The close happens only after the worker's own event loop has fully drained, so any messages the worker posted are already queued in the pipe.
- `handle_posted_message` treats `closed` as EOF only when `msg_queue` is empty, so queued messages are delivered before the parent observes EOF. The happy path (worker posts a message, parent receives it, then worker exits) still works.
- `closed` is an idempotent flag set under the pipe mutex; closing from both sides (worker exit + parent terminate) is harmless. The pipe struct is refcounted and freed via `js_eventloop_free`, not by setting `closed`.
- Verified: all 5 worker test files (99 tests: override/exit/onerror/stress/initial-data) pass, and the three hang repros (missing module with/without handlers, `undefined` filename) now exit 0.

## How this surfaced

`tests/worker-initial-data.test.ts` accidentally passed `undefined` as the worker filename: it used `workerInitialDataFixturesPath.concat("x.js")`, but `pathMarker(...).concat(...)` returns ANOTHER marker FUNCTION, not a path string. `JSON.stringify(aFunction)` is `undefined`, which interpolated into the inline `qjs -e` source as the literal token `undefined`, so every test ran `new Worker(undefined, ...)`. Fix: CALL the marker - `workerInitialDataFixturesPath("x.js")` returns the resolved path. The sibling worker tests do `const f = fixturesDir.concat("worker-xyz")` then call `f("name.js")`; `.concat` only narrows the base dir, you still have to call the result. This is a separate (test) bug from the engine hang, but the engine hang is the real latent footgun and is independent of `initialData`.
