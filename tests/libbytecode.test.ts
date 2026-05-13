import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("bytecode - normal values", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        function log(label, arg) { console.log(label, inspect(arg)); }

        const bc1 = bytecode.fromValue(7);
        log("fromValue 7", bc1);
        log("back toValue", bytecode.toValue(bc1));

        const bc2 = bytecode.fromValue({ a: 5 });
        log("fromValue { a: 5 }", bc2);
        log("back toValue", bytecode.toValue(bc2));
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
      "stdout": "fromValue 7 ArrayBuffer {
    	│0x00000000│ 06 00 05 0E
    }
    back toValue 7
    fromValue { a: 5 } ArrayBuffer {
    	│0x00000000│ 06 01 02 61 08 01 D0 03 05 0A
    }
    back toValue {
    	a: 5
    }
    ",
    }
  `);
});

test("bytecode - script file", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        function log(label, arg) { console.log(label, inspect(arg)); }

        const bc = bytecode.fromFile("tests/fixtures/log-four.js");
        log("fromFile", bc);
        const reified = bytecode.toValue(bc);
        log("toValue", reified);
        const result = reified();
        log("result", result);
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
      "stdout": "fromFile ArrayBuffer {
    	│0x00000000│ 06 03 0E 63 6F 6E 73 6F 6C 65 06 6C 6F 67 34 74
    	│0x00000010│ 65 73 74 73 2F 66 69 78 74 75 72 65 73 2F 6C 6F
    	│0x00000020│ 67 2D 66 6F 75 72 2E 6A 73 0C 00 06 00 A8 01 00
    	│0x00000030│ 01 00 04 00 00 12 01 AA 01 00 00 00 39 E8 00 00
    	│0x00000040│ 00 43 E9 00 00 00 B9 B9 9F 24 01 00 CF 28 D4 03
    	│0x00000050│ 08 00 00 1B 0E 25 0E 07 05 00
    }
    toValue Function "bound bytecode" {
    	│1│ function bound bytecode() {
    	│2│     [native code]
    	│3│ }
    }
    4
    result undefined
    ",
    }
  `);
});

test("bytecode - module file", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        function log(label, arg) { console.log(label, inspect(arg)); }

        const bc = bytecode.fromFile("tests/fixtures/exports-five.js", { sourceType: "module" });
        log("fromFile", bc);
        const reified = bytecode.toValue(bc);
        log("toValue", reified);
        const result = reified();
        log("result", result);
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
      "stdout": "fromFile ArrayBuffer {
    	│0x00000000│ 06 05 3C 74 65 73 74 73 2F 66 69 78 74 75 72 65
    	│0x00000010│ 73 2F 65 78 70 6F 72 74 73 2D 66 69 76 65 2E 6A
    	│0x00000020│ 73 08 66 69 76 65 0E 63 6F 6E 73 6F 6C 65 06 6C
    	│0x00000030│ 6F 67 16 65 78 70 6F 72 74 69 6E 67 20 35 0D D0
    	│0x00000040│ 03 00 01 00 00 D2 03 00 00 00 0C 20 06 01 A8 01
    	│0x00000050│ 00 00 00 03 01 00 1B 00 D2 03 00 0D 08 EC 02 29
    	│0x00000060│ 39 EA 00 00 00 43 EB 00 00 00 04 EC 00 00 00 24
    	│0x00000070│ 01 00 0E BC E3 06 2F D0 03 06 00 00 2F 0E 34 08
    	│0x00000080│ 00
    }
    toValue Function "bound bytecode" {
    	│1│ function bound bytecode() {
    	│2│     [native code]
    	│3│ }
    }
    exporting 5
    result undefined
    ",
    }
  `);
});

// =========== fromFile with encodedFileName ===========

test("bytecode - fromFile with encodedFileName option", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");

        const bc = bytecode.fromFile("tests/fixtures/log-four.js", {
          encodedFileName: "custom-name.js",
        });
        const fn = bytecode.toValue(bc);
        // The function should run and print 4
        fn();
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
      "stdout": "4
    ",
    }
  `);
});

// =========== toValue with invalid bytecode ===========

test("bytecode - toValue with invalid bytecode throws", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        try {
          bytecode.toValue(new ArrayBuffer(4));
          console.log("no error");
        } catch (e) {
          console.log("error:", e.constructor.name);
        }
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
      "stdout": "error: SyntaxError
    ",
    }
  `);
});

// =========== fromValue with various types ===========

test("bytecode - fromValue with string", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const bc = bytecode.fromValue("hello world");
        console.log("type:", typeof bc, bc instanceof ArrayBuffer);
        const val = bytecode.toValue(bc);
        console.log("back:", val);
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
      "stdout": "type: object true
    back: hello world
    ",
    }
  `);
});

test("bytecode - fromValue with array", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const bc = bytecode.fromValue([1, 2, 3]);
        console.log("type:", typeof bc, bc instanceof ArrayBuffer);
        const val = bytecode.toValue(bc);
        console.log("back:", JSON.stringify(val));
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
      "stdout": "type: object true
    back: [1,2,3]
    ",
    }
  `);
});

test("bytecode - fromValue with function", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const bc = bytecode.fromValue(function add(a, b) { return a + b; });
        console.log("type:", typeof bc, bc instanceof ArrayBuffer);
        const fn = bytecode.toValue(bc);
        console.log("result:", fn(3, 4));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "TypeError: unsupported object class
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

// ============================================================================
// Error-class serialization (serializeErrors option on fromValue/toValue)
// ============================================================================

test("bytecode - without serializeErrors, Error instances throw on write", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        try {
          bytecode.fromValue(new Error("x"));
          console.log("unexpected success");
        } catch (e) {
          console.log("caught:", e.constructor.name, e.message);
        }
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
      "stdout": "caught: TypeError unsupported object class
    ",
    }
  `);
});

test("bytecode - without serializeErrors on read, Error tag throws", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const buf = bytecode.fromValue(new Error("x"), { serializeErrors: true });
        try {
          bytecode.toValue(buf);
          console.log("unexpected success");
        } catch (e) {
          console.log("caught:", e.constructor.name, e.message);
        }
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
      "stdout": "caught: SyntaxError invalid tag (tag=20 pos=3)
    ",
    }
  `);
});

test("bytecode - cyclic Error (err.cause = err) round-trips with identity preserved", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const e = new Error("cycle-msg");
        e.cause = e;
        const buf = bytecode.fromValue(e, { serializeErrors: true });
        const r = bytecode.toValue(buf, { serializeErrors: true });
        console.log("isError:", r instanceof Error);
        console.log("msg:", r.message);
        console.log("cycle-identity:", r.cause === r);
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
      "stdout": "isError: true
    msg: cycle-msg
    cycle-identity: true
    ",
    }
  `);
});

test("bytecode - AggregateError round-trips with nested Error instances preserved", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const agg = new AggregateError([
          new TypeError("t"),
          new RangeError("r"),
        ], "agg-msg");
        const buf = bytecode.fromValue(agg, { serializeErrors: true });
        const r = bytecode.toValue(buf, { serializeErrors: true });
        console.log("isAggregate:", r instanceof AggregateError);
        console.log("msg:", r.message);
        console.log("errorsLen:", r.errors.length);
        console.log("errors[0] isTypeError:", r.errors[0] instanceof TypeError);
        console.log("errors[0] msg:", r.errors[0].message);
        console.log("errors[1] isRangeError:", r.errors[1] instanceof RangeError);
        console.log("errors[1] msg:", r.errors[1].message);
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
      "stdout": "isAggregate: true
    msg: agg-msg
    errorsLen: 2
    errors[0] isTypeError: true
    errors[0] msg: t
    errors[1] isRangeError: true
    errors[1] msg: r
    ",
    }
  `);
});

test("bytecode - all 9 recognized Error classes reify to their exact class", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const classes = [
          Error, TypeError, RangeError, SyntaxError, ReferenceError,
          URIError, EvalError, AggregateError, InternalError,
        ];
        for (const C of classes) {
          const src = C === AggregateError ? new C([], "m") : new C("m");
          const buf = bytecode.fromValue(src, { serializeErrors: true });
          const r = bytecode.toValue(buf, { serializeErrors: true });
          console.log(C.name, "instanceof", C.name + ":", r instanceof C);
        }
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
      "stdout": "Error instanceof Error: true
    TypeError instanceof TypeError: true
    RangeError instanceof RangeError: true
    SyntaxError instanceof SyntaxError: true
    ReferenceError instanceof ReferenceError: true
    URIError instanceof URIError: true
    EvalError instanceof EvalError: true
    AggregateError instanceof AggregateError: true
    InternalError instanceof InternalError: true
    ",
    }
  `);
});

test("bytecode - shared references among Errors preserve identity", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const common = new Error("common-cause");
        const e1 = new Error("e1"); e1.cause = common;
        const e2 = new Error("e2"); e2.cause = common;
        const buf = bytecode.fromValue([e1, e2], { serializeErrors: true });
        const [r1, r2] = bytecode.toValue(buf, { serializeErrors: true });
        console.log("both cause same:", r1.cause === r2.cause);
        console.log("cause message:", r1.cause.message);
        console.log("cause isError:", r1.cause instanceof Error);
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
      "stdout": "both cause same: true
    cause message: common-cause
    cause isError: true
    ",
    }
  `);
});

test("bytecode - user Error subclass reifies to base Error with custom props preserved", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        class MyError extends Error {
          constructor(m) { super(m); this.name = "MyError"; }
        }
        const src = Object.assign(new MyError("custom-msg"), { code: 42 });
        const buf = bytecode.fromValue(src, { serializeErrors: true });
        const r = bytecode.toValue(buf, { serializeErrors: true });
        console.log("isError:", r instanceof Error);
        console.log("name:", r.name);
        console.log("message:", r.message);
        console.log("code:", r.code);
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
      "stdout": "isError: true
    name: MyError
    message: custom-msg
    code: 42
    ",
    }
  `);
});

// `strip: "source" | "debug" | false` on bytecode.fromFile.
//
// Top-level script bodies don't store source by default (upstream
// behavior), so the strip effect is only observable when the input
// file contains nested function declarations. The fixture
// `tests/fixtures/named-function.js` has one such function so the
// "source" strip path is exercisable.

test("bytecode.fromFile strip: source drops fn source bytes", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const fixture = "tests/fixtures/named-function.js";
        function asStr(buf) {
          return Array.from(new Uint8Array(buf))
            .map(b => String.fromCharCode(b))
            .join("");
        }

        const a = bytecode.fromFile(fixture);
        const b = bytecode.fromFile(fixture, { strip: "source" });

        console.log("default bytes:", a.byteLength);
        console.log("strip source bytes:", b.byteLength);
        console.log("source-stripped is shorter:", b.byteLength < a.byteLength);
        console.log("default has source:", asStr(a).includes("fancyDoubler(n)"));
        console.log("stripped has source:", asStr(b).includes("fancyDoubler(n)"));
        bytecode.toValue(b)();
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
      "stdout": "default bytes: 213
    strip source bytes: 169
    source-stripped is shorter: true
    default has source: true
    stripped has source: false
    42
    ",
    }
  `);
});

test("bytecode.fromFile strip: debug drops all debug info", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const fixture = "tests/fixtures/named-function.js";

        const a = bytecode.fromFile(fixture);
        const b = bytecode.fromFile(fixture, { strip: "source" });
        const c = bytecode.fromFile(fixture, { strip: "debug" });

        console.log("default:", a.byteLength);
        console.log("strip source:", b.byteLength);
        console.log("strip debug:", c.byteLength);
        console.log("debug < source:", c.byteLength < b.byteLength);
        bytecode.toValue(c)();
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
      "stdout": "default: 213
    strip source: 169
    strip debug: 96
    debug < source: true
    42
    ",
    }
  `);
});

test("bytecode.fromFile strip: false matches default", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const fixture = "tests/fixtures/named-function.js";

        const a = bytecode.fromFile(fixture);
        const b = bytecode.fromFile(fixture, { strip: false });

        const aArr = Array.from(new Uint8Array(a));
        const bArr = Array.from(new Uint8Array(b));
        console.log("same length:", aArr.length === bArr.length);
        console.log("byte-identical:", aArr.every((x, i) => x === bArr[i]));
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
      "stdout": "same length: true
    byte-identical: true
    ",
    }
  `);
});

test("bytecode.fromFile strip: rejects invalid values", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const fixture = "tests/fixtures/named-function.js";

        function shouldThrow(opt, label) {
          try {
            bytecode.fromFile(fixture, { strip: opt });
            console.log(label + ": NO THROW");
          } catch (e) {
            console.log(label + ": " + e.message);
          }
        }

        shouldThrow("garbage", "bad string");
        shouldThrow(42, "number");
        shouldThrow(null, "null");
        shouldThrow(true, "true");
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
      "stdout": "bad string: invalid strip value: garbage (expected "source", "debug", or false)
    number: 'strip' option must be a string ("source" or "debug") or false
    null: 'strip' option must be a string ("source" or "debug") or false
    true: 'strip' option must be a string ("source" or "debug") or false
    ",
    }
  `);
});
