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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 2,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: that's bad!
        at <eval> (<cmdline>:5)

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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 5,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 2,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});
