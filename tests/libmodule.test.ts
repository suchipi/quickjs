import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("isModuleNamespace", async () => {
  const fixture = rootDir("tests/fixtures/check-module-ns.js");

  const run = spawn(binDir("qjs"), [fixture], { cwd: rootDir() });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exporting 5
    isModuleNamespace(ns): true
    isModuleNamespace({}): false
    isModuleNamespace(null): false
    isModuleNamespace(42): false
    ",
    }
  `);
});
