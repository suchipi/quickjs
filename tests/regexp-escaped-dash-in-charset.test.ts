import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("RegExp: escaped dash in character set", async () => {
  const run = spawn(
    binDir("qjs"),
    ["tests/fixtures/regexp-escaped-dash-in-charset.js"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "/([\\w\\-:])/suy
    ",
    }
  `);
});
