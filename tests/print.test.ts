import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("quickjs-print", async () => {
  const run = spawn(binDir("qjs"), [rootDir("examples/logging.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "console.warn 3 {  }
    console.error 4 {  }
    ",
      "stdout": "print 1 {  }
    console.log 2 {  }
    console.info 5 {  }
    ",
    }
  `);
});
