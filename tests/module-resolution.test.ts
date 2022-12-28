import { spawn } from "first-base";
import { binDir } from "./_utils";

describe("module resolution", () => {
  test("can resolve sibling files", async () => {
    const run = spawn(binDir("qjs"), ["./fixtures/subdir/reaches-over.js"], {
      cwd: __dirname,
    });
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "5
      ",
      }
    `);
  });

  test("can resolve parent-dir files", async () => {
    const run = spawn(binDir("qjs"), ["./fixtures/subdir/reaches-up.js"], {
      cwd: __dirname,
    });
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

  test("can resolve files with an index.js inside", async () => {
    const run = spawn(
      binDir("qjs"),
      ["./fixtures/subdir/reaches-for-folder-with-index.js"],
      {
        cwd: __dirname,
      }
    );
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "hello there
      ",
      }
    `);
  });

  test("can resolve builtin modules", async () => {
    const run = spawn(binDir("qjs"), ["./fixtures/subdir/imports-std.js"], {
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
});
