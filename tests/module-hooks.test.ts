import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("Module.compilers and Module.searchExtensions", async () => {
  const run = spawn(
    binDir("qjs"),
    ["tests/fixtures/module-hooks/load-txt.js"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello world!

      ",
    }
  `);
});
