import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

/* These tests cover the fork's port of upstream's `js_print` rewire
   (commit be06b3e). Before the port, `console.log({a:1})` produced
   `[object Object]`; now it produces `{ a: 1 }` via JS_PrintValue.
   Strings stay on the fast `JS_ToCStringLen` path.

   Run via `qjs -e` template literals (no fixture files needed). */

function runQjs(prog: string) {
  const run = spawn(binDir("qjs"), ["-e", prog]);
  return run;
}

test("console.log: object args use JS_PrintValue (was [object Object])", async () => {
  const run = runQjs(`
    console.log({ a: 1 });
    console.log([1, 2, 3]);
    console.log(new Map([["k", "v"]]));
  `);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ a: 1 }
    [ 1, 2, 3 ]
    Map(1) { "k" => "v" }
    ",
    }
  `);
});

test("console.log: string args still use JS_ToCStringLen (no quotes added)", async () => {
  const run = runQjs(`
    console.log("plain string");
    console.log("multi\\nline");
  `);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "plain string
    multi
    line
    ",
    }
  `);
});

test("console.log: mixed string and non-string args", async () => {
  const run = runQjs(`console.log("a", { b: 2 }, 3, [4, 5]);`);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "a { b: 2 } 3 [ 4, 5 ]
    ",
    }
  `);
});

test("print: object args use JS_PrintValue", async () => {
  const run = runQjs(`
    print({ a: 1 });
    print([1, 2, 3]);
  `);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ a: 1 }
    [ 1, 2, 3 ]
    ",
    }
  `);
});

test("console.warn / console.error: object args go to stderr via JS_PrintValue", async () => {
  const run = runQjs(`
    console.warn({ w: 1 });
    console.error({ e: 2 });
  `);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "{ w: 1 }
    { e: 2 }
    ",
      "stdout": "",
    }
  `);
});

test("REPL still uses inspect (NOT JS_PrintValue) for result formatting", async () => {
  /* Drive the REPL via a PTY so it detects a TTY and runs in
     interactive mode. To unambiguously verify that the REPL routes
     result formatting through `inspect()` (and not the new
     `JS_PrintValue`), we install an `inspect.custom` formatter on a
     value and evaluate it. `inspect.custom` is a fork-specific hook
     that ONLY `inspect()` honors — `JS_PrintValue` does not. If the
     custom formatter fires, the REPL must be using inspect.

     This is a regression guard: confirms we did NOT accidentally
     rewire the REPL during this port. */
  const run = spawn(binDir("qjs"), ["--interactive"], { pty: true });
  await run.outputContains("qjs >");
  /* Define a value whose inspect.custom hook produces a unique
     marker string. We can't easily assert "the marker appears" via a
     stdout substring check (because the user's typed input is also
     echoed and would contain the marker), so we send the marker via
     a side effect instead: the inspect.custom handler writes a
     sentinel file. Then we check the file. */
  run.write(`globalThis.__inspectCustomFired = false;\n`);
  await run.outputContains(/^false\s*$/m);
  run.write(
    `({ [inspect.custom]() { globalThis.__inspectCustomFired = true; return "INSPECT_RAN"; } })\n`
  );
  /* Wait for the formatted result to appear (the return value
     "INSPECT_RAN" gets quoted by inspect to "INSPECT_RAN"). */
  await run.outputContains(/INSPECT_RAN/);
  /* Now query the side-effect flag — its presence proves the
     custom hook fired, which proves inspect() was used. */
  run.write(`globalThis.__inspectCustomFired\n`);
  await run.outputContains(/^true\s*$/m);
  run.write("\x04");
  await run.completion;
});

test("QJU_PrintError: throw {a: 1} now uses JS_PrintValue (was [object Object])", async () => {
  const run = runQjs(`throw { a: 1 };`);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: { a: 1 }
    ",
      "stdout": "",
    }
  `);
});

test("QJU_PrintError: throw new Error('x') still uses canonical Error format", async () => {
  /* Error path is intentionally unchanged — fork's QJU_PrintError uses
     the canonical `Name: message\\n  stack` format (more thorough than
     upstream's one-liner). Verify the Error path still produces that
     shape (cleanResult collapses the stack lines to "at somewhere"). */
  const run = runQjs(`throw new Error("x");`);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: x
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("QJU_PrintError: throw 'oops' still JSON-stringifies thrown strings", async () => {
  /* String throws still take the JSON.stringify path (so we get
     `"oops"` with quotes — distinct from the unquoted `oops` you'd get
     from JS_PrintValue). Verify this branch is intact. */
  const run = runQjs(`throw "oops";`);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: "oops"
    ",
      "stdout": "",
    }
  `);
});
