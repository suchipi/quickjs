---
paths:
  - "src/builtin-modules/quickjs-os/quickjs-os.c"
  - "src/quickjs-eventloop/quickjs-eventloop.h"
  - "src/quickjs-eventloop/quickjs-eventloop.c"
  - "src/quickjs-modulesys/quickjs-modulesys.c"
---

# Worker onerror: multi-fire rejection dedup via reason-pointer identity

## Gotcha

Evaluating a JS module that has a top-level `throw` produces a *chain*
of three distinct rejected promises inside QuickJS's module-evaluation
machinery, all sharing the identical thrown reason `JSValue`. If both
`JS_SetHostPromiseRejectionTracker` and
`QJMS_AttachEntryRejectionHandler` are installed (as they are on worker
runtimes for the `onerror` feature), a single `throw` fires four
reports — three from the tracker chain, one from the entry-rejection
handler — so the parent's `onerror` gets called four times for one
throw.

## Why the obvious fixes fail

- Suppressing the tracker until post-`JS_LoadModule` misses
  `Promise.reject(new Error(...))` at module top level, which fires the
  tracker synchronously during module body evaluation (same phase as
  the top-level-throw chain). Can't tell the two apart by timing.
- Skipping the entry-rejection handler when the promise is already
  rejected (early dedup) misses the "module rejected but tracker
  disarmed" case and makes the main-thread path behave differently from
  the worker path.

## The working approach

`qju_report_exception_hook_impl` keeps the pointer of the last reason
it shipped over the error pipe in `JSThreadState.last_reported_reason_ptr`.
On each new report it compares `JS_VALUE_GET_PTR(reason)` against that
field; identical means "same underlying reason, already reported" → skip.

Dedup covers both `JS_TAG_OBJECT` *and* `JS_TAG_STRING` reasons. Object
cases are obvious (thrown Error instances). String cases matter because
`throw "some string"` at module top level runs through the exact same
rejection-chain machinery — the tracker fires three times with the
same string JSValue, then the entry-rejection handler fires a fourth
time. The string's backing pointer is stable across those fires (the
rejection chain propagates the same JSValue), so pointer identity
works to collapse them. Without this, a string-throw with no `.onerror`
set prints `thrown non-Error value: "..."` four times to stderr.

Other primitive tags (`JS_TAG_INT`, `JS_TAG_BOOL`, `JS_TAG_NULL`,
`JS_TAG_UNDEFINED`, `JS_TAG_FLOAT64`) use inline value storage with no
meaningful pointer, so they skip dedup. Repeated number/bool/null
throws are rare enough that duplicate reports don't matter, and trying
to dedup by content would add complexity.

## Bounded dedup window

The pointer is cleared between event-loop ticks in `js_eventloop_run`,
right after each microtask-drain loop and before the next poll. The
rejection chain for a single throw happens entirely within one
synchronous microtask drain, so the dedup window closes at the natural
boundary. Leaving the pointer set indefinitely would risk a false
positive if a later throw's reason happened to land at the same
freed-and-reused heap address — the reviewer caught this as a silent
drop risk during PR review.

## Where this is important

If you change any of:
- how `QJMS_AttachEntryRejectionHandler` reports (it hits
  `QJU_ReportException` via its fail path)
- how `worker_promise_rejection_tracker` reports
- the `QJU_ReportException` → `qju_report_exception_hook` indirection
- the per-tick clear in `js_eventloop_run`

…check that the reason-pointer dedup still kicks in. Grep
`last_reported_reason_ptr` — if the hook isn't the single funnel,
dedup becomes a sieve and the multi-fire regresses. If the per-tick
clear moves, the stale-address risk comes back.
