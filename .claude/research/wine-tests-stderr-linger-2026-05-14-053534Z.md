---
name: wine-tests-stderr-linger
description: Wine tests take ~5.5s each because wineserver inherits Node's stdio pipes during cold start and holds them open through its shutdown linger; warming with stdio:"ignore" drops per-test time to ~100ms.
paths:
  - tests/_utils.ts
  - tests/worker-onerror.test.ts
  - tests/worker-stress.test.ts
  - tests/worker-exit.test.ts
  - tests/create-process.test.ts
  - tests/oldtests/oldtests.test.ts
---

# Wine tests pay a ~5.5s/test stderr-linger tax

## Symptom

Every `[wine]` test (across `worker-onerror.test.ts`, `worker-stress.test.ts`,
`worker-exit.test.ts`, `create-process.test.ts`, etc.) reports ~5400-6000ms,
regardless of what the test actually does. A bare `wine qjs.exe -e "2+2"`
takes ~80ms on a warm wineserver, so the slowness is entirely fixed
per-invocation overhead, not test work.

## Root cause

It's the interaction between three things:

1. **Node's `child_process.spawn` gives wine inherited pipes for stdio.**
2. **When wineserver is started cold by such a wine process, it inherits
   those pipes** and keeps them open for its whole lifetime, including the
   ~3-4s "linger" after the last client exits (controlled by
   `WINESERVER_TIMEOUT`, default 3).
3. **`first-base.spawn().completion` resolves on the `'close'` event,
   not `'exit'`.** Close requires every stdio stream to be EOF'd. Since
   wineserver still holds the pipes, close fires only when wineserver
   finally shuts down.

Empirically measured (see `.tmp/wine-spawn-probe*.js` if regenerated):

```
wine -e "2+2" via Node default pipes:
  exit@1.4s   close@5.5s   <-- 4s lag, that's wineserver linger

wine -e "2+2" via Node with stdio: "ignore":
  exit@1.3s   close@1.3s   <-- no lag, wineserver has no inherited pipes
```

## Why current `setupWineHooks()` doesn't actually warm anything

[tests/_utils.ts:36-43](tests/_utils.ts#L36-L43) warms wineserver with
`wineSpawn(["-e", "2 + 2"])` and waits on `.completion`. But:

- `wineSpawn` → `first-base.spawn` → captures stdio with pipes
- wineserver inherits those pipes during cold start
- `.completion` waits for `close` → blocks ~5.5s
- by the time warmup "completes", wineserver has already lingered out
  and shut down — so it isn't warm for the next test either

So every test cold-starts wineserver again and pays the same ~5.5s tax.

## Fix

Spawn the warmup with `stdio: "ignore"` so wineserver doesn't inherit
Node's pipes. After that, subsequent `wineSpawn` calls reuse the still-
alive wineserver and complete in ~100ms (close fires immediately because
wineserver doesn't have a handle on the new test's stderr either —
those pipes belong to the new wine wrapper, which closes them when it
exits).

Verified in the probe: with an `stdio: "ignore"` warmup, three sequential
`wineSpawn`-style runs each took ~100ms vs ~5500ms without the fix.

`first-base` doesn't expose a `stdio` option through its public API
(`spawn(cmd, args, options)` forwards `options` straight to
`child_process.spawn`, so it does work — `wineSpawn(["-e", "2 + 2"], { stdio: "ignore" })`
should be enough, as long as a future first-base version doesn't strip
unknown keys).

Alternative fixes:

- Call `child_process.spawn("wineserver", ["-p"])` directly with
  detached/ignored stdio in `beforeAll`, and `wineserver -k` in
  `afterAll`. More invasive; not needed unless we want wineserver to
  persist longer than the default 3s linger between *files*.
- Set `WINESERVER_TIMEOUT` to a very large number so wineserver doesn't
  linger out, then keep one wine process alive in the background to
  hold it open. Fragile.

## Why this looked like a recent regression

The slowness has always been present per wine test, but it became
noticeable when commit `efbfbd4` (port upstream 8bb41b2 — enabled
os.Worker on Windows) added 20+ new `[wine]` tests to
`worker-onerror.test.ts` plus more in `worker-stress.test.ts` and
`worker-exit.test.ts`. With ~20 wine tests per file at 5.5s each,
single-file totals balloon (e.g. `worker-onerror.test.ts` ≈ 124s).
The earlier wine-test footprint was small enough that the per-test tax
was unremarkable.

## Gotcha when investigating

`time wine qjs.exe -e "2+2"` from a shell reports 80-90ms warm — this
does NOT reproduce the issue, because the shell's stdio handles
(terminal or pipe to `cat`) aren't inherited the same way as Node's
pipes. You must spawn from Node (or any process that uses pipe()-based
stdio) to see the 5s linger. Don't rely on `/usr/bin/time` here.
