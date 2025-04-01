import { spawn } from "first-base";
import { binDir, fixturesDir, cleanResult } from "./_utils";

test("stack filename", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("stack-filename.js")]);
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "0: <rootDir>/tests/fixtures/stack-filename/inner.js
    1: <rootDir>/tests/fixtures/stack-filename/middle.js
    2: <rootDir>/tests/fixtures/stack-filename/outer.js
    3: <rootDir>/tests/fixtures/stack-filename.js
    4 error: Error: Cannot determine the caller filename for the given stack level. Maybe you're using eval?
    -1 error: Error: Cannot determine the caller filename for the given stack level. Maybe you're using eval?
    Infinity: <rootDir>/tests/fixtures/stack-filename/inner.js
    -Infinity: <rootDir>/tests/fixtures/stack-filename/inner.js
    ",
    }
  `);
});
