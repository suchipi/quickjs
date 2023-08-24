import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("pointer", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const { Pointer } = require("quickjs:pointer");

        console.log("Pointer:", inspect(Pointer));

        console.log("Pointer.isPointer(42):", Pointer.isPointer(42));
        console.log("Pointer.isPointer(Pointer.NULL):", Pointer.isPointer(Pointer.NULL));
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
      "stdout": "Pointer: Function "Pointer" {
    	NULL: Pointer {
    		_info: "(nil)"
    	}
    	isPointer: Function "isPointer" {
    		│1│ function isPointer() {
    		│2│     [native code]
    		│3│ }
    	}
    	
    	│1│ function Pointer() {
    	│2│     [native code]
    	│3│ }
    }
    Pointer.isPointer(42): false
    Pointer.isPointer(Pointer.NULL): true
    ",
    }
  `);
});
