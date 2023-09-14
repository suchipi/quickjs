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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "fromValue 7 ArrayBuffer {
    	│0x00000000│ 02 00 05 0E
    }
    back toValue 7
    fromValue { a: 5 } ArrayBuffer {
    	│0x00000000│ 02 01 02 61 08 01 C6 03 05 0A
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "fromFile ArrayBuffer {
    	│0x00000000│ 02 03 0E 63 6F 6E 73 6F 6C 65 06 6C 6F 67 34 74
    	│0x00000010│ 65 73 74 73 2F 66 69 78 74 75 72 65 73 2F 6C 6F
    	│0x00000020│ 67 2D 66 6F 75 72 2E 6A 73 0E 00 06 00 A2 01 00
    	│0x00000030│ 01 00 04 00 00 12 01 A4 01 00 00 00 38 E3 00 00
    	│0x00000040│ 00 42 E4 00 00 00 B7 B7 9D 24 01 00 CD 28 CA 03
    	│0x00000050│ 01 00
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "fromFile ArrayBuffer {
    	│0x00000000│ 02 05 3C 74 65 73 74 73 2F 66 69 78 74 75 72 65
    	│0x00000010│ 73 2F 65 78 70 6F 72 74 73 2D 66 69 76 65 2E 6A
    	│0x00000020│ 73 08 66 69 76 65 0E 63 6F 6E 73 6F 6C 65 06 6C
    	│0x00000030│ 6F 67 16 65 78 70 6F 72 74 69 6E 67 20 35 0F C6
    	│0x00000040│ 03 00 01 00 00 C8 03 00 00 0E 00 06 01 A2 01 00
    	│0x00000050│ 00 00 03 01 00 1A 00 C8 03 00 0D 08 EA 02 29 38
    	│0x00000060│ E5 00 00 00 42 E6 00 00 00 04 E7 00 00 00 24 01
    	│0x00000070│ 00 0E BA E1 29 C6 03 01 03 01 17 62
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
