import { test, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "first-base";
import { binDir, removeSanitizer, restoreSanitizer } from "./_utils";

// These tests assert on the real "at file:line:col" frames, so disable the
// sanitizer that would otherwise collapse them to "at somewhere".
beforeEach(() => {
  removeSanitizer("collapseStackTrace");
});
afterEach(() => {
  restoreSanitizer("collapseStackTrace");
});

test("mapper rewrites stack string and own-props together", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper((filename, line, column) => {
        return { filename: "original.ts", line: 42, column: 7 };
      });
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("stack:", err.stack);
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "stack:     at <anonymous> (original.ts:42:7)

    fileName: original.ts
    lineNumber: 42
    columnNumber: 7
    ",
    }
  `);
});

test("no mapper registered: locations unchanged", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: <cmdline>
    lineNumber: 3
    columnNumber: 24
    ",
    }
  `);
});

test("mapper returning null leaves locations unchanged", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper(() => null);
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: <cmdline>
    lineNumber: 5
    columnNumber: 24
    ",
    }
  `);
});

test("mapper returning incomplete object is ignored", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper(() => ({ line: 99 }));
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: <cmdline>
    lineNumber: 5
    columnNumber: 24
    ",
    }
  `);
});

test("throwing mapper is swallowed; locations unchanged", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper(() => {
        throw new Error("mapper blew up");
      });
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
      console.log("survived");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: <cmdline>
    lineNumber: 7
    columnNumber: 24
    survived
    ",
    }
  `);
});

test("unregistering with null restores default behavior", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper(() => ({ filename: "original.ts", line: 1, column: 1 }));
      setStackFrameMapper(null);
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: <cmdline>
    lineNumber: 6
    columnNumber: 24
    ",
    }
  `);
});

test("mapper that unregisters itself mid-call does not crash", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper((filename, line, column) => {
        // Unregister (and drop the only other reference to) this very mapper
        // while it is still executing, then return a mapped location.
        setStackFrameMapper(null);
        return { filename: "original.ts", line: 42, column: 7 };
      });
      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
      console.log("survived");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: original.ts
    lineNumber: 42
    columnNumber: 7
    survived
    ",
    }
  `);
});

test("getStackFrameMapper returns null when none registered", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { getStackFrameMapper } from "quickjs:engine";
      console.log("mapper:", getStackFrameMapper());
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "mapper: null
    ",
    }
  `);
});

test("getStackFrameMapper allows composing on top of an existing mapper", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper, getStackFrameMapper } from "quickjs:engine";

      // Base mapper rewrites the filename.
      setStackFrameMapper((filename, line, column) => {
        return { filename: "base.ts", line, column };
      });

      // Wrap it: delegate to the base, then bump the line number.
      const base = getStackFrameMapper();
      setStackFrameMapper((filename, line, column) => {
        const mapped = base(filename, line, column);
        return { ...mapped, line: mapped.line + 100 };
      });

      try {
        throw new Error("boom");
      } catch (err) {
        console.log("fileName:", err.fileName);
        console.log("lineNumber:", err.lineNumber);
        console.log("columnNumber:", err.columnNumber);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fileName: base.ts
    lineNumber: 117
    columnNumber: 24
    ",
    }
  `);
});

test("getStackFrameMapper result can be discarded without gc issues", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper, getStackFrameMapper, gc } from "quickjs:engine";

      // Register a mapper in its own scope so the only surviving reference is
      // the one held by the engine's internal slot.
      (() => {
        setStackFrameMapper((filename, line, column) => {
          return { filename, line, column };
        });
      })();

      gc();

      // Read the mapper back and immediately throw the result away. If
      // getStackFrameMapper mis-counted, the borrowed-vs-owned mismatch would
      // surface as a gc assertion failure at teardown (when the runtime is
      // freed) - we deliberately don't gc() again here so that only
      // teardown-time collection catches it.
      (() => {
        getStackFrameMapper();
      })();

      setStackFrameMapper(null);

      console.log("ok");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "ok
    ",
    }
  `);
});

test("non-function, non-null argument throws TypeError", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { setStackFrameMapper } from "quickjs:engine";
      try {
        setStackFrameMapper(42);
      } catch (err) {
        console.log("caught:", err.name, err.message);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: TypeError setStackFrameMapper requires a function, null, or undefined
    ",
    }
  `);
});
