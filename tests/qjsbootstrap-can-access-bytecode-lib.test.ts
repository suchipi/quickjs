import fs from "fs";
import path from "path";
import { cp, rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workdir = rootDir(
  "build/tests/tests/qjsbootstrap-can-access-bytecode-lib"
);

beforeEach(() => {
  rm("-rf", workdir);
  mkdir("-p", workdir);
});

test("qjsbootstrap - can access bytecode lib", async () => {
  const prog = path.join(workdir, "myprog");
  cp(binDir("qjsbootstrap"), prog);
  fs.appendFileSync(prog, "console.log(inspect(require('quickjs:bytecode')))");

  const run2 = spawn(prog, { argv0: "myprog" });
  await run2.completion;
  expect(run2.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	Null prototype
    	Sealed
    	
    	fromFile: Function "fromFile" {
    		│1│ function fromFile() {
    		│2│     [native code]
    		│3│ }
    	}
    	fromValue: Function "fromValue" {
    		│1│ function fromValue() {
    		│2│     [native code]
    		│3│ }
    	}
    	toValue: Function "toValue" {
    		│1│ function toValue() {
    		│2│     [native code]
    		│3│ }
    	}
    }
    ",
    }
  `);
});
