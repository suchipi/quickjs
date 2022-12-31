// unlike Node.js's CommonJS implementation, QuickJS's script goal cannot set exports.
// in Node.js, code only runs in the module goal if it uses ESM. CJS code runs in the script goal.
// in QuickJS, code runs in the module goal whether it uses CJS or ESM.
//
// NOTE: this does mean that code which might run in non-strict mode in Node.js
// will instead run in strict mode when loaded in QuickJS. This is probably
// fine? But if not, we'll have to change this.

import { spawn } from "first-base";
import { binDir } from "./_utils";

test("script goal: 'exports' and 'module' are both undefined", async () => {
  const run = spawn(
    binDir("qjs"),
    ["--script", "./fixtures/log-typeof-module-and-exports.js"],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exports: undefined
    module: undefined
    ",
    }
  `);
});

test("module goal: 'exports' and 'module' are both objects", async () => {
  const run = spawn(
    binDir("qjs"),
    ["--module", "./fixtures/log-typeof-module-and-exports.js"],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exports: object
    module: object
    ",
    }
  `);
});
