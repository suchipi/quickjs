import { test, expect } from "vitest";
import { spawn } from "first-base";
import {
  binDir,
  fixturesDir,
  setupWineHooks,
  shouldRunWineTests,
  wineSpawn,
} from "./_utils";

const testFixturesDir = fixturesDir.concat("worker-exit");
const testFixturesDir2 = fixturesDir.concat("worker-exit2");

if (shouldRunWineTests) {
  setupWineHooks();
}

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

test.runIf(shouldRunWineTests)(
  "[wine] cmdline.exit in worker throws",
  async () => {
    const run = wineSpawn([testFixturesDir("main.js")]);
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
  }
);

test("worker terminates when main sets worker.onmessage = null", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-terminate-via-onmessage.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "in main
    in worker
    in worker, waiting for termination
    in main, received: {
    	data: "ready"
    }
    in main, terminating worker by setting onmessage = null
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] worker terminates when main sets worker.onmessage = null",
  async () => {
    const run = wineSpawn([testFixturesDir("main-terminate-via-onmessage.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "in main
      in worker
      in worker, waiting for termination
      in main, received: {
      	data: "ready"
      }
      in main, terminating worker by setting onmessage = null
      ",
      }
    `);
  }
);

test("worker terminates when main calls worker.terminate()", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-terminate-method.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "in main
    in worker
    in worker, waiting for termination
    in main, received: {
    	data: "ready"
    }
    in main, calling worker.terminate()
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] worker terminates when main calls worker.terminate()",
  async () => {
    const run = wineSpawn([testFixturesDir("main-terminate-method.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "in main
      in worker
      in worker, waiting for termination
      in main, received: {
      	data: "ready"
      }
      in main, calling worker.terminate()
      ",
      }
    `);
  }
);

test("cmdline.exit in worker throws (single message)", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir2("main.js")]);
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

test.runIf(shouldRunWineTests)(
  "[wine] cmdline.exit in worker throws (single message)",
  async () => {
    const run = wineSpawn([testFixturesDir2("main.js")]);
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
  }
);
