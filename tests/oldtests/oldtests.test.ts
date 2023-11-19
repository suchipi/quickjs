import { spawn } from "first-base";
import { binDir } from "../_utils";

async function qjs(args: Array<string>) {
  const run = spawn(binDir("qjs"), args, { cwd: __dirname });
  await run.completion;
  return run.result;
}

describe("oldtests", () => {
  test("test_bignum.js", async () => {
    expect(await qjs(["--bignum", "./test_bignum.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_builtin.js", async () => {
    expect(await qjs(["./test_builtin.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_closure.js", async () => {
    expect(await qjs(["./test_closure.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_language.js", async () => {
    expect(await qjs(["./test_language.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_loop.js", async () => {
    expect(await qjs(["./test_loop.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_op_overloading.js", async () => {
    expect(await qjs(["--bignum", "./test_op_overloading.js"]))
      .toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_qjscalc.js", async () => {
    expect(await qjs(["--qjscalc", "./test_qjscalc.js"]))
      .toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_std.js", async () => {
    expect(await qjs(["./test_std.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });

  test("test_worker.js", async () => {
    expect(await qjs(["./test_worker.js"])).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "",
        "stdout": "",
      }
    `);
  });
});
