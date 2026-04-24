import { test, describe, expect } from "vitest";
import { spawn } from "first-base";
import { sleep } from "a-mimir";
import { binDir } from "../_utils";

async function qjs(args: Array<string>, debug?: boolean) {
  const run = spawn(binDir("qjs"), args, { cwd: __dirname, debug });
  await Promise.race([
    run.completion,
    sleep.async(4500).then(() => {
      run.kill("SIGKILL");
    }),
  ]);
  return run.result;
}

describe("oldtests", () => {
  test("test_bigint.js", async () => {
    expect(await qjs(["./test_bigint.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_builtin.js", async () => {
    expect(await qjs(["./test_builtin.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_closure.js", async () => {
    expect(await qjs(["./test_closure.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_language.js", async () => {
    expect(await qjs(["./test_language.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_loop.js", async () => {
    expect(await qjs(["./test_loop.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_std.js", async () => {
    expect(await qjs(["./test_std.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_worker.js", async () => {
    expect(await qjs(["./test_worker.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  });
});
