import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

test("Promises work", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        console.log("one");
        Promise.resolve(true).then(() => {
          console.log("two");
        });

        {
          var resolve, reject;
          const p = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });
          p.then(() => {
            console.log("three");
          });
          resolve(5);
        }

        {
          var resolve, reject;
          const p = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });
          p.catch((err) => {
            console.log("four", err);
          });
          reject(new Error("nah"));
        }
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "one
    two
    three
    four Error: nah
    ",
    }
  `);
});
