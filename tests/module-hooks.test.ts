import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("ModuleDelegate.compilers and ModuleDelegate.searchExtensions", async () => {
  const run = spawn(
    binDir("qjs"),
    ["tests/fixtures/module-hooks/load-txt.js"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "content: hello world!

    ",
    }
  `);
});

test("a compiler for extensionless files applies inside a dotted directory", async () => {
  const run = spawn(
    binDir("qjs"),
    ["tests/fixtures/module-hooks/load-from-dotted-dir.js"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "content: this is not javascript
    ",
    }
  `);
});
