import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const fixture = rootDir("tests/fixtures/import-meta-require.js");

test("import.meta.require", async () => {
  const run = spawn(binDir("quickjs-run"), [fixture]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	import.meta.require: Function "require" {
    		resolve: Function "require.resolve" {
    			│1│ function require.resolve() {
    			│2│     [native code]
    			│3│ }
    		}
    		
    		│1│ function require() {
    		│2│     [native code]
    		│3│ }
    	}
    	import.meta.require === globalThis.require: true
    	import.meta.require('quickjs:bytecode'): {
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
    }
    ",
    }
  `);
});
