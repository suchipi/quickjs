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
      "stderr": "Error: cmdline.exit can only be called from the main thread
        at <internal>/quickjs-cmdline.c:42
        at exit (native)
        at <anonymous> (/Users/suchipi/Code/quickjs/tests/fixtures/worker-exit/worker.js:9)

    ",
      "stdout": "in main
    in worker
    in main, sending try-to-exit-with-cmdline
    in worker, received: {
    	data: "try-to-exit-with-cmdline"
    }
    in main, sending exit-properly
    in worker, received: {
    	data: "exit-properly"
    }
    ",
    }
  `);
});
