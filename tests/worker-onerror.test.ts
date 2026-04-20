import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const f = fixturesDir.concat("worker-onerror");

async function runFixture(name: string) {
  const run = spawn(binDir("qjs"), [f(name, "main.js")], { cwd: __dirname });
  await run.completion;
  return run.cleanResult();
}

test("TLA rejection with onerror set — event shape + Error instance", async () => {
  expect(await runFixture("tla-reject-handled")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "message: tla boom
    error instanceof Error: true
    error.name: Error
    error.message: tla boom
    typeof lineno: number
    lineno > 0: true
    filename ends in: tla-reject-handled/worker.mjs
    ",
    }
  `);
});

test("TLA rejection with no onerror — stderr fallback", async () => {
  expect(await runFixture("tla-reject-unhandled")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "Error: tla boom, no handler
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("sync throw from JS_LoadModule (syntax error) — onerror fires with SyntaxError", async () => {
  expect(await runFixture("syntax-error")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error.name: SyntaxError
    error is SyntaxError: true
    ",
    }
  `);
});

test("missing import — onerror fires with resolver TypeError/Error", async () => {
  expect(await runFixture("missing-import")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error.name: Error
    error is Error: true
    message contains 'does-not-exist': true
    ",
    }
  `);
});

test("onerror itself throws — secondary error printed to stderr", async () => {
  expect(await runFixture("onerror-itself-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "Error: secondary from onerror
        at somewhere

    ",
      "stdout": "first-onerror fires
    ",
    }
  `);
});

test("same-tick onerror assignment deterministically fires", async () => {
  expect(await runFixture("same-tick-onerror")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "same-tick onerror fired
    ",
    }
  `);
});

test("custom Error properties round-trip", async () => {
  expect(await runFixture("custom-props")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error.code: E_FOO
    error.detail.kind: x
    error.message: boom with extras
    ",
    }
  `);
});

test("non-Error throw — event.error === null", async () => {
  expect(await runFixture("non-error-throw")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error === null: true
    message: plain string
    ",
    }
  `);
});

test("non-Error throw with no onerror — stderr matches QJU_PrintError format", async () => {
  expect(await runFixture("non-error-throw-no-handler")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "thrown non-Error value: "plain string"
    ",
      "stdout": "",
    }
  `);
});

test("cycles in error.cause are preserved", async () => {
  expect(await runFixture("cause-cycle")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is Error: true
    message: cycle-msg
    cause === error (cycle preserved): true
    ",
    }
  `);
});

test("AggregateError reification with nested Error classes", async () => {
  expect(await runFixture("aggregate-error")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "is AggregateError: true
    message: agg-msg
    errors.length: 2
    errors[0] is TypeError: true
    errors[0].message: t
    errors[1] is RangeError: true
    errors[1].message: r
    ",
    }
  `);
});

test("each builtin Error class reifies to its exact class", async () => {
  expect(await runFixture("builtin-classes")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error instanceof Error: true
    Error has nested: object
    classes.typeError is TypeError: true
    classes.rangeError is RangeError: true
    classes.syntaxError is SyntaxError: true
    classes.referenceError is ReferenceError: true
    classes.uriError is URIError: true
    classes.evalError is EvalError: true
    classes.internalError is InternalError: true
    classes.aggregateError is AggregateError: true
    ",
    }
  `);
});

test("user Error subclass reifies to base Error with .name preserved", async () => {
  expect(await runFixture("user-subclass")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is Error: true
    error.name: MyError
    error.message: custom-msg
    error.code: 42
    ",
    }
  `);
});

test("worker onmessage throw — parent onerror receives TypeError", async () => {
  expect(await runFixture("onmessage-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is TypeError: true
    error.message: bad msg: boom
    ",
    }
  `);
});

test("setTimeout callback throw — parent onerror receives RangeError", async () => {
  expect(await runFixture("settimeout-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is RangeError: true
    error.message: late
    ",
    }
  `);
});

test("unhandled promise rejection — parent onerror fires with error", async () => {
  expect(await runFixture("unhandled-rejection")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is Error: true
    error.message: unhandled
    ",
    }
  `);
});

test("late .catch after unhandled rejection — onerror fires exactly once", async () => {
  expect(await runFixture("late-catch")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "onerror fired, count=1
    error.message: x
    final call count: 1
    ",
    }
  `);
});

test("parent-side onmessage throw — goes to stderr, not worker.onerror", async () => {
  expect(await runFixture("parent-onmessage-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "Error: parent bug
        at somewhere

    ",
      "stdout": "about to throw from parent onmessage
    ",
    }
  `);
});

test("I/O read handler throw (unix) — parent onerror fires", async () => {
  expect(await runFixture("io-handler-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error.message: io handler boom
    ",
    }
  `);
});

/* Plan test 19 (signal handler throw in worker) is infeasible as specified —
   os.signal can only be set from the main thread in QuickJS (throws
   "signal handler can only be set in the main thread"). The fixture
   instead exercises the error-pipe routing for a main-thread-only API
   being called inside a worker — the error is still reported through
   onerror, validating the same code path. */
test("main-thread-only signal API in worker — onerror fires with TypeError", async () => {
  expect(await runFixture("signal-handler-throws")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error.message: signal handler can only be set in the main thread
    ",
    }
  `);
});

test("serialization failure — meta-error shipped with originalReasonString", async () => {
  expect(await runFixture("serialize-failure")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error is Error: true
    message prefix: true
    has originalReasonString: true
    ",
    }
  `);
});

