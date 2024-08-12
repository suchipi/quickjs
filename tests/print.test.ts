import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("quickjs-print", async () => {
  const run = spawn(binDir("qjs"), [rootDir("examples/logging.js")]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "console.warn 3 [object Object]
    console.error 4 [object Object]
    ",
      "stdout": "print 1 [object Object]
    console.log 2 [object Object]
    console.info 5 [object Object]
    ",
    }
  `);
});
