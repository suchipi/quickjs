import { spawn } from "first-base";
import { binDir } from "./_utils";

describe("ModuleDelegate.read", () => {
  test("default impl returns file content", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          require("./fixtures/log-four.js");
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
        "stdout": "4
      ",
      }
    `);
  });

  test("custom impl can override", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-m",
        "-e",
        `
          import { ModuleDelegate } from "quickjs:module";

          ModuleDelegate.read = (path) => {
            console.error(path);
            return "console.log(17);"
          };

          require("./fixtures/log-four");
        `,
      ],
      { cwd: __dirname }
    );
    await run.completion;
    run.result.stderr = run.result.stderr.replace(__dirname, "<__dirname>");
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "<__dirname>/fixtures/log-four.js
      ",
        "stdout": "17
      ",
      }
    `);
  });
});
