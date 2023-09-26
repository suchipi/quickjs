import { spawn } from "first-base";
import { binDir, rootDir, cleanResult } from "./_utils";

const fixture = rootDir("tests/fixtures/import-meta-resolve.js");

test("import.meta.resolve", async () => {
  const run = spawn(binDir("quickjs-run"), [fixture]);
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	import.meta.resolve: Function "require.resolve" {
    		│1│ function require.resolve() {
    		│2│     [native code]
    		│3│ }
    	}
    	import.meta.resolve === globalThis.require.resolve: true
    	import.meta.resolve('./log-four'): "<rootDir>/tests/fixtures/log-four.js"
    }
    ",
    }
  `);
});
