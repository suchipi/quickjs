import { spawn } from "first-base";
import { binDir } from "./_utils";

test("using custom Module.resolve and custom Module.read to import stuff via std.urlGet", async () => {
  const run = spawn(binDir("qjs"), ["./fixtures/load-module-via-urlget.js"], {
    cwd: __dirname,
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "function
    ",
    }
  `);
});
