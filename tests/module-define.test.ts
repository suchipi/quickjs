import { spawn } from "first-base";
import { binDir } from "./_utils";

test("defineBuiltinModule - basic test", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { defineBuiltinModule, ModuleDelegate } from "quickjs:engine";

      console.log("builtins contains mymodule:", ModuleDelegate.builtinModuleNames.includes("mymodule"));

      defineBuiltinModule("mymodule", {
        something: 5,
        somethingElse: () => 6
      });

      console.log("builtins contains mymodule:", ModuleDelegate.builtinModuleNames.includes("mymodule"));

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
      "stdout": "builtins contains mymodule: false
    builtins contains mymodule: true
    5
    6
    ",
    }
  `);
});

test("defineBuiltinModule - never imported", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { defineBuiltinModule, ModuleDelegate } from "quickjs:engine";

      console.log("builtins contains mymodule:", ModuleDelegate.builtinModuleNames.includes("mymodule"));

      defineBuiltinModule("mymodule", {
        something: 5,
        somethingElse: () => 6
      });

      console.log("builtins contains mymodule:", ModuleDelegate.builtinModuleNames.includes("mymodule"));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "builtins contains mymodule: false
    builtins contains mymodule: true
    ",
    }
  `);
});

test("defineBuiltinModule - bypasses toplevel module resolution", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { defineBuiltinModule, ModuleDelegate } from "quickjs:engine";

      let called = false;
      ModuleDelegate.resolve = (name, fromFile) => {
        called = true;
        return name;
      }

      defineBuiltinModule("mymodule", {
        something: 5,
        somethingElse: () => 6
      });

      console.log("called", called);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "called false
    ",
    }
  `);
});
