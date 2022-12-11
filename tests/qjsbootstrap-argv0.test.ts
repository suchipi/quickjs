import { spawn } from "first-base";
import { binDir } from "./_utils";

test("qjsbootstrap - finds itself properly when argv0 is indirect", async () => {
  const run = spawn(binDir("qjsbootstrap"), {
    argv0: "something not particularly helpful",
    cwd: "/tmp",
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "append UTF-8 encoded JavaScript to the end of this binary to change this binary into a program that executes that JavaScript code
    ",
    }
  `);
});
