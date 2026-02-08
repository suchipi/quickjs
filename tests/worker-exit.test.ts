import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const testFixturesDir = fixturesDir.concat("worker-exit");

test("cmdline.exit in worker throws", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main.js")]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: std.exit can only be called from the main thread
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
