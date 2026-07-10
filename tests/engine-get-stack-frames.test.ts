import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

test("getStackFrames - multi-level named call stack from a fixture", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("get-stack-frames.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "[
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames.js"
    		lineNumber: 4
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames.js"
    		lineNumber: 8
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames.js"
    		lineNumber: 12
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames.js"
    		lineNumber: 15
    		columnNumber: 21
    	}
    ]
    ",
    }
  `);
});

test("getStackFrames - call stack spanning multiple files", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    fixturesDir("get-stack-frames-cross-file.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "[
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames-cross-file.js"
    		lineNumber: 5
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames-helper.js"
    		lineNumber: 2
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames-cross-file.js"
    		lineNumber: 9
    		columnNumber: 3
    	}
    	{
    		fileName: "<rootDir>/tests/fixtures/get-stack-frames-cross-file.js"
    		lineNumber: 12
    		columnNumber: 33
    	}
    ]
    ",
    }
  `);
});

test("getStackFrames - skip drops from the innermost end", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const engine = require("quickjs:engine");
      function inner() {
        return {
          full: engine.getStackFrames(),
          skip1: engine.getStackFrames(1),
          skip2: engine.getStackFrames(2),
        };
      }
      function wrapper() {
        return inner();
      }
      const result = wrapper();
      // Each frame is identified by its lineNumber (every call above is on a
      // distinct line). skip(n) must equal the full stack with its n innermost
      // frames removed - i.e. full.slice(n) - not full.slice(0, -n), which is
      // what an implementation that dropped from the wrong end would produce.
      const lines = (frames) => frames.map((frame) => frame.lineNumber);
      const fullLines = lines(result.full);
      console.log("full:", inspect(fullLines));
      console.log("skip1 === full.slice(1):",
        JSON.stringify(lines(result.skip1)) === JSON.stringify(fullLines.slice(1)));
      console.log("skip2 === full.slice(2):",
        JSON.stringify(lines(result.skip2)) === JSON.stringify(fullLines.slice(2)));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "full: [
    	5
    	11
    	13
    ]
    skip1 === full.slice(1): true
    skip2 === full.slice(2): true
    ",
    }
  `);
});

test("getStackFrames - mapper is applied to frame locations", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { getStackFrames, setStackFrameMapper } from "quickjs:engine";
      setStackFrameMapper((filename, line, column) => {
        return { filename: "mapped.ts", line: 1, column: 1 };
      });
      function inner() {
        return getStackFrames();
      }
      function outer() {
        return inner();
      }
      const frames = outer();
      const located = frames.filter((frame) => frame.fileName != null);
      console.log("allMapped:", located.every((frame) =>
        frame.fileName === "mapped.ts" && frame.lineNumber === 1 && frame.columnNumber === 1));
      console.log("locatedCount:", located.length);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "allMapped: true
    locatedCount: 3
    ",
    }
  `);
});

test("getStackFrames - honors backtraceBarrier", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { getStackFrames, evalScript } from "quickjs:engine";

      const code = \`
        (function () {
          const engine = require('quickjs:engine');
          function shallow() { return engine.getStackFrames(); }
          function deep() { return shallow(); }
          return deep();
        })()
      \`;
      const withoutBarrier = evalScript(code);
      const withBarrier = evalScript(code, { backtraceBarrier: true });

      const isPrefix = withBarrier.length < withoutBarrier.length &&
        withBarrier.every((frame, index) =>
          JSON.stringify(frame) === JSON.stringify(withoutBarrier[index]));

      console.log("barrierIsShorter:", withBarrier.length < withoutBarrier.length);
      console.log("barrierIsInnermostPrefix:", isPrefix);
      console.log("withoutBarrier:", inspect(withoutBarrier));
      console.log("withBarrier:", inspect(withBarrier));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "barrierIsShorter: true
    barrierIsInnermostPrefix: true
    withoutBarrier: [
    	{
    		fileName: "<evalScript>"
    		lineNumber: 4
    		columnNumber: 32
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 5
    		columnNumber: 29
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 6
    		columnNumber: 11
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 7
    		columnNumber: 11
    	}
    	{
    		fileName: null
    		lineNumber: null
    		columnNumber: null
    	}
    	{
    		fileName: "<cmdline>"
    		lineNumber: 12
    		columnNumber: 40
    	}
    ]
    withBarrier: [
    	{
    		fileName: "<evalScript>"
    		lineNumber: 4
    		columnNumber: 32
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 5
    		columnNumber: 29
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 6
    		columnNumber: 11
    	}
    	{
    		fileName: "<evalScript>"
    		lineNumber: 7
    		columnNumber: 11
    	}
    ]
    ",
    }
  `);
});

test("getStackFrames - each frame's location fields are all-or-nothing", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { getStackFrames } from "quickjs:engine";
      // Capture from inside an Array.prototype.map callback: the immediate
      // caller is the native (C) map builtin, which has no source location, so
      // this forces an unlocated frame into the stack. The [0] unwraps the
      // single-element result back to the frames array the callback returned.
      const frames = [1].map(() => getStackFrames())[0];
      console.log("frames length:", frames.length);
      const invariantHolds = frames.every((frame) => {
        const hasFile = frame.fileName != null;
        const hasLine = frame.lineNumber != null;
        const hasColumn = frame.columnNumber != null;
        return (hasFile === hasLine) && (hasLine === hasColumn);
      });
      console.log("invariantHolds:", invariantHolds);
      const nativeFrames = frames.filter((frame) => frame.fileName == null);
      console.log("hasNativeFrame:", nativeFrames.length > 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "frames length: 3
    invariantHolds: true
    hasNativeFrame: true
    ",
    }
  `);
});

test("getStackFrames - negative skip throws RangeError", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { getStackFrames } from "quickjs:engine";
      try {
        getStackFrames(-1);
      } catch (err) {
        console.log("name:", err.name);
        console.log("message:", err.message);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "name: RangeError
    message: skip must be a non-negative number
    ",
    }
  `);
});
