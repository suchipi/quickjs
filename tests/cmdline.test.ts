import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

test("setting exit code and exiting normally", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("setting exit code and exiting with cmdline.exit", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
        cmdline.exit();
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("overriding the set exit code by exiting with cmdline.exit", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
        cmdline.exit(2);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 2,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("overriding the set exit code with unhandled exception", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
        throw new Error("that's bad!");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: that's bad!
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("getting the set exit code", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
        const code = cmdline.getExitCode();
        print(code);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": null,
      "stderr": "",
      "stdout": "5
    ",
    }
  `);
});

test("setting the exit code multiple times (last wins)", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");

        cmdline.setExitCode(5);
        cmdline.setExitCode(4);
        cmdline.setExitCode(0);
        cmdline.setExitCode(2);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 2,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});

// =========== getScriptArgs ===========

test("cmdline.getScriptArgs returns script arguments", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");
        const args = cmdline.getScriptArgs();
        console.log("type:", typeof args, Array.isArray(args));
        console.log("length > 0:", args.length > 0);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: object true
    length > 0: true
    ",
    }
  `);
});

test("cmdline.getScriptArgs includes extra arguments", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");
        const args = cmdline.getScriptArgs();
        // Print last two args
        console.log(args.slice(-2).join(" "));
      `,
      "arg1",
      "arg2",
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "arg1 arg2
    ",
    }
  `);
});

// =========== scriptArgs global ===========

test("scriptArgs global matches cmdline.getScriptArgs()", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");
        const fromModule = cmdline.getScriptArgs();
        const fromGlobal = scriptArgs;
        console.log("same ref:", fromModule === fromGlobal);
        console.log("both arrays:", Array.isArray(fromModule), Array.isArray(fromGlobal));
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "same ref: true
    both arrays: true true
    ",
    }
  `);
});

// =========== exit with no argument ===========

test("cmdline.exit() with no argument uses default exit code 0", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");
        console.log("before exit");
        cmdline.exit();
        console.log("after exit");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "before exit
    ",
    }
  `);
});

test("cmdline.exit() with no argument uses setExitCode value", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const cmdline = require("quickjs:cmdline");
        cmdline.setExitCode(3);
        cmdline.exit();
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 3,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});
