import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const testFixturesDir = fixturesDir.concat("worker-exit2");

test("cmdline.exit in worker throws", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "Error: cmdline.exit can only be called from the main thread
        at somewhere

    ",
      "stdout": "in main
    in worker
    in main, sending try-to-exit
    in worker, received: {
    	data: "try-to-exit"
    }
    ",
    }
  `);
});
