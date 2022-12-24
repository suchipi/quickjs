import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("bytecode", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("bytecode");

        function log(label, arg) { console.log(label, inspect(arg)); }

        const bc1 = bytecode.fromValue(7);
        log("fromValue 7", bc1);
        log("back toValue", bytecode.toValue(bc1));

        const bc2 = bytecode.fromValue({ a: 5 });
        log("fromValue { a: 5 }", bc2);
        log("back toValue", bytecode.toValue(bc2));

        const bc3 = bytecode.fromFile("tests/fixtures/log-four.js");
        log("fromFile", bc3);
        const reified = bytecode.toValue(bc3);
        log("file toValue", reified);
        reified();
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
    	│0x00000000│ 02 01 02 61 08 01 C2 03 05 0A
    }
    back toValue {
    	a: 5
    }
    fromFile ArrayBuffer {
    	│0x00000000│ 02 03 0E 63 6F 6E 73 6F 6C 65 06 6C 6F 67 34 74
    	│0x00000010│ 65 73 74 73 2F 66 69 78 74 75 72 65 73 2F 6C 6F
    	│0x00000020│ 67 2D 66 6F 75 72 2E 6A 73 0E 00 06 00 A0 01 00
    	│0x00000030│ 01 00 04 00 00 12 01 A2 01 00 00 00 38 E1 00 00
    	│0x00000040│ 00 42 E2 00 00 00 B7 B7 9D 24 01 00 CD 28 C6 03
    	│0x00000050│ 01 00
    }
    file toValue Function {
    	│1│ function bound bytecode() {
    	│2│     [native code]
    	│3│ }
    }
    4
    ",
    }
  `);
});
