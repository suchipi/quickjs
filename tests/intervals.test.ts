import { spawn } from "first-base";
import { binDir } from "./_utils";

test("setInterval and clearInterval are present", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        console.log(typeof setInterval, typeof clearInterval);
        const interval = setInterval(() => {});
        console.log(interval);
        clearInterval(interval);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "function function
    [object Object]
    ",
    }
  `);
});
