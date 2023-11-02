import { spawn } from "first-base";
import { binDir } from "./_utils";

test("Module.define - basic test", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { Module } from "quickjs:module";

      Module.define("mymodule", {
        something: 5,
        somethingElse: () => 6
      });
      const mod = require("mymodule");
      console.log(mod.something);
      console.log(mod.somethingElse());
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "5
    6
    ",
    }
  `);
});

test("Module.define - never imported", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { Module } from "quickjs:module";

      Module.define("mymodule", {
        something: 5,
        somethingElse: () => 6
      });
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});
