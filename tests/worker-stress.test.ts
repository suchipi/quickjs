import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const testFixturesDir = fixturesDir.concat("worker-stress");

test("worker spams messages, main terminates without reading", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-spam-then-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: sent 500 messages
    main: terminating worker
    main: done
    ",
    }
  `);
});

test("worker spams messages, main reads them all", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-spam-then-read.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: sent 500 messages
    main: received final message after 501 total
    ",
    }
  `);
});

test("terminate idle worker", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-terminate-idle-worker.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: started
    main: worker is ready, terminating
    main: done
    ",
    }
  `);
});

test("terminate without ever setting onmessage", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-terminate-no-onmessage.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: started
    main: terminating worker (never set onmessage)
    main: done
    ",
    }
  `);
});

test("double terminate does not crash", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-double-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: started
    main: first terminate
    main: second terminate
    main: done
    ",
    }
  `);
});

test("postMessage after terminate", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-post-after-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    worker: started
    main: terminating
    main: posting after terminate
    main: postMessage succeeded
    main: done
    ",
    }
  `);
});

test("main never cleans up, worker exits on its own", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-no-cleanup.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "main: creating worker
    main: worker created, not doing anything with it
    worker: started
    worker: doing work
    worker: done, exiting on own
    ",
    }
  `);
});

test("worker throws during message handling, then main terminates", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-worker-throws.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: worker error
        at somewhere

    ",
      "stdout": "main: creating worker
    worker: started
    main: sending message to trigger throw
    worker: received message, throwing
    main: terminating after worker threw
    main: done
    ",
    }
  `);
});
