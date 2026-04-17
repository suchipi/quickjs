import { test, describe, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

describe("shared library modules (examples)", () => {
  test("fib", async () => {
    const run = spawn(
      binDir("qjs"),
      ["src/shared-library-modules/example-fib/test_fib.js"],
      { cwd: rootDir() }
    );
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "fib(10)= 55
      ",
      }
    `);
  });

  test("point", async () => {
    const run = spawn(
      binDir("qjs"),
      ["src/shared-library-modules/example-point/test_point.js"],
      { cwd: rootDir() }
    );
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "normal usage... PASS
      subclass usage... PASS
      ",
      }
    `);
  });
});
