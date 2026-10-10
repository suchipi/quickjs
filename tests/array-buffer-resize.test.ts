import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("resize and grow check that the buffer is resizable before converting the length", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        function attempt(label, callback) {
          try {
            callback();
            console.log(label, "-> no error");
          } catch (error) {
            console.log(label, "->", error.constructor.name);
          }
        }

        let conversions = 0;
        const countedLength = {
          valueOf() {
            conversions++;
            return 2;
          },
        };

        attempt("fixed-length resize(-1)", () => new ArrayBuffer(4).resize(-1));
        attempt("fixed-length resize(Infinity)", () => new ArrayBuffer(4).resize(Infinity));
        attempt("fixed-length resize(2)", () => new ArrayBuffer(4).resize(2));
        attempt("fixed-length resize(object)", () => new ArrayBuffer(4).resize(countedLength));
        attempt("fixed-length shared grow(-1)", () => new SharedArrayBuffer(4).grow(-1));
        attempt("fixed-length shared grow(object)", () => new SharedArrayBuffer(4).grow(countedLength));
        console.log("length conversions on fixed-length buffers:", conversions);

        attempt("resizable resize(-1)", () => new ArrayBuffer(4, { maxByteLength: 8 }).resize(-1));
        attempt("resizable resize(9)", () => new ArrayBuffer(4, { maxByteLength: 8 }).resize(9));
        attempt("resizable resize(8)", () => new ArrayBuffer(4, { maxByteLength: 8 }).resize(8));
        attempt("growable shared grow(-1)", () => new SharedArrayBuffer(4, { maxByteLength: 8 }).grow(-1));

        const detached = new ArrayBuffer(4, { maxByteLength: 8 });
        detached.transfer();
        attempt("detached resizable resize(-1)", () => detached.resize(-1));
        attempt("detached resizable resize(2)", () => detached.resize(2));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fixed-length resize(-1) -> TypeError
    fixed-length resize(Infinity) -> TypeError
    fixed-length resize(2) -> TypeError
    fixed-length resize(object) -> TypeError
    fixed-length shared grow(-1) -> TypeError
    fixed-length shared grow(object) -> TypeError
    length conversions on fixed-length buffers: 0
    resizable resize(-1) -> RangeError
    resizable resize(9) -> RangeError
    resizable resize(8) -> no error
    growable shared grow(-1) -> RangeError
    detached resizable resize(-1) -> RangeError
    detached resizable resize(2) -> TypeError
    ",
    }
  `);
});
