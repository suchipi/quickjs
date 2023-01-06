import { spawn } from "first-base";
import { binDir } from "./_utils";

test("module with error is gc'd properly: esm", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const std = require("quickjs:std");
        try {
          require("./fixtures/module-throws-error/esm.js");
        } catch (err) {
          console.error(err);
        }
        require("./fixtures/log-four");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: that ain't good
    ",
      "stdout": "4
    ",
    }
  `);
});

test("module with error is gc'd properly: cjs", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const std = require("quickjs:std");
        try {
          require("./fixtures/module-throws-error/cjs.js");
        } catch (err) {
          console.error(err);
        }
        require("./fixtures/log-four");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: that ain't good
    ",
      "stdout": "4
    ",
    }
  `);
});

test("module with error is gc'd properly: cjs file that requires cjs", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const std = require("quickjs:std");
        try {
          require("./fixtures/module-throws-error/requires-cjs.js");
        } catch (err) {
          console.error(err);
        }
        require("./fixtures/log-four");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: that ain't good
    ",
      "stdout": "4
    ",
    }
  `);
});
