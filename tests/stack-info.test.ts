import { spawn } from "first-base";
import { binDir, fixturesDir, cleanResult } from "./_utils";

test("stack info", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("stack-info.js")]);
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "0: {"filename":"<rootDir>/tests/fixtures/stack-info/inner.js","lineNumber":3,"source":"function inner(num) {\\n  return engine.getStackFrameInfo(num);\\u0000"}
    1: {"filename":"<rootDir>/tests/fixtures/stack-info/middle.js","lineNumber":3,"source":"function middle(num) {\\n  return inner(num);\\u0000"}
    2: {"filename":"<rootDir>/tests/fixtures/stack-info/outer.js","lineNumber":3,"source":"function outer(num) {\\n  return middle(num);\\u0000"}
    3: {"filename":"<rootDir>/tests/fixtures/stack-info.js","lineNumber":1,"source":null}
    4: {"filename":null,"lineNumber":-1,"source":null}
    -1: {"filename":null,"lineNumber":-1,"source":null}
    Infinity: {"filename":"<rootDir>/tests/fixtures/stack-info/inner.js","lineNumber":3,"source":"function inner(num) {\\n  return engine.getStackFrameInfo(num);\\u0000"}
    -Infinity: {"filename":"<rootDir>/tests/fixtures/stack-info/inner.js","lineNumber":3,"source":"function inner(num) {\\n  return engine.getStackFrameInfo(num);\\u0000"}
    ",
    }
  `);
});
