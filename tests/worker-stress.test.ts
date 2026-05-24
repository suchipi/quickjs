import { test, expect } from "vitest";
import { spawn } from "first-base";
import {
  binDir,
  fixturesDir,
  rootDir,
  setupWineHooks,
  shouldRunWineTests,
  wineSpawn,
} from "./_utils";

const testFixturesDir = fixturesDir.concat("worker-stress");

if (shouldRunWineTests) {
  setupWineHooks();
}

test("worker spams messages, main terminates without reading", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-spam-then-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    worker: sent 500 messages
    main: terminating worker
    main: done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] worker spams messages, main terminates without reading",
  async () => {
    const run = wineSpawn([testFixturesDir("main-spam-then-terminate.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "main: creating worker
      worker: sent 500 messages
      main: terminating worker
      main: done
      ",
      }
    `);
  }
);

test("worker spams messages, main reads them all", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-spam-then-read.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    worker: sent 500 messages
    main: received final message after 501 total
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] worker spams messages, main reads them all",
  async () => {
    const run = wineSpawn([testFixturesDir("main-spam-then-read.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "main: creating worker
      worker: sent 500 messages
      main: received final message after 501 total
      ",
      }
    `);
  }
);

test("terminate idle worker", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-terminate-idle-worker.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: worker is ready, terminating
    main: done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)("[wine] terminate idle worker", async () => {
  const run = wineSpawn([testFixturesDir("main-terminate-idle-worker.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
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
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: terminating worker (never set onmessage)
    main: done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] terminate without ever setting onmessage",
  async () => {
    const run = wineSpawn([testFixturesDir("main-terminate-no-onmessage.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "main: creating worker
      main: terminating worker (never set onmessage)
      main: done
      ",
      }
    `);
  }
);

test("double terminate does not crash", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-double-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: first terminate
    main: second terminate
    main: done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] double terminate does not crash",
  async () => {
    const run = wineSpawn([testFixturesDir("main-double-terminate.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: first terminate
    main: second terminate
    main: done
    ",
    }
  `);
  }
);

test("postMessage after terminate", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-post-after-terminate.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: terminating
    main: posting after terminate
    main: postMessage succeeded
    main: done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] postMessage after terminate",
  async () => {
    const run = wineSpawn([testFixturesDir("main-post-after-terminate.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "main: creating worker
    main: terminating
    main: posting after terminate
    main: postMessage succeeded
    main: done
    ",
    }
  `);
  }
);

test("main never cleans up, worker exits on its own", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-no-cleanup.js")]);
  await run.completion;
  const { code, error, stderr, stdout } = run.cleanResult();
  expect({ code, error, stderr }).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
    }
  `);

  // ordering is indeterminate
  const stdoutLines = stdout.split("\n");
  expect(stdoutLines).toContain("main: creating worker");
  expect(stdoutLines).toContain(
    "main: worker created, not doing anything with it"
  );
  expect(stdoutLines).toContain("worker: started");
  expect(stdoutLines).toContain("worker: doing work");
  expect(stdoutLines).toContain("worker: done, exiting on own");
});

test.runIf(shouldRunWineTests)(
  "[wine] main never cleans up, worker exits on its own",
  async () => {
    const run = wineSpawn([testFixturesDir("main-no-cleanup.js")]);
    await run.completion;
    const { code, error, stderr, stdout } = run.cleanResult();
    expect({ code, error, stderr }).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
      }
    `);

    const stdoutLines = stdout.split("\r\n");
    expect(stdoutLines).toContain("main: creating worker");
    expect(stdoutLines).toContain(
      "main: worker created, not doing anything with it"
    );
    expect(stdoutLines).toContain("worker: started");
    expect(stdoutLines).toContain("worker: doing work");
    expect(stdoutLines).toContain("worker: done, exiting on own");
  }
);

test("std.out.flush works in worker", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-worker-std-out.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "worker: std.out is object
    worker: std.out.flush is function
    worker: flush succeeded
    main: worker finished
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] std.out.flush works in worker",
  async () => {
    const run = wineSpawn([testFixturesDir("main-worker-std-out.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "worker: std.out is object
    worker: std.out.flush is function
    worker: flush succeeded
    main: worker finished
    ",
    }
  `);
  }
);

test("SIGKILL kills process while worker is running", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-worker-runs-forever.js"),
  ]);

  // Give the worker time to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  run.kill("SIGKILL");
  await run.completion;

  expect(run.result.code).not.toBe(0);
});

test("SIGTERM kills process while worker is running", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-worker-runs-forever.js"),
  ]);

  // Give the worker time to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  run.kill("SIGTERM");
  await run.completion;

  expect(run.result.code).not.toBe(0);
});

test("SIGINT kills process while worker is running", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-worker-runs-forever.js"),
  ]);

  // Give the worker time to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  run.kill("SIGINT");
  await run.completion;

  expect(run.result.code).not.toBe(0);
});

test.runIf(shouldRunWineTests)(
  "[wine] taskkill terminates qjs.exe while worker is running",
  async () => {
    const fs = await import("fs");
    const path = await import("path");
    const tmpDir = rootDir(".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const pidFile = path.join(
      tmpDir,
      `qjs-wine-pid-${process.pid}-${Date.now()}.txt`
    );
    const run = wineSpawn(
      [testFixturesDir("main-worker-runs-forever-with-pidfile.js")],
      { env: { ...process.env, QJS_PID_FILE: pidFile } }
    );
    let pid: string | null = null;
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      try {
        const contents = fs.readFileSync(pidFile, "utf8").trim();
        if (contents.length > 0) {
          pid = contents;
          break;
        }
      } catch {
        // pidfile not written yet
      }
    }
    fs.unlinkSync(pidFile);
    expect(pid).not.toBeNull();
    const kill = spawn("wine", ["taskkill", "/pid", pid!, "/f"]);
    await kill.completion;
    await run.completion;
    expect(run.result.code).not.toBe(0);
  }
);

test("os.exec works while worker is running", async () => {
  const run = spawn(binDir("qjs"), [
    testFixturesDir("main-exec-with-worker.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello from exec
    exec returned: 0
    done
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] os.exec works while worker is running",
  async () => {
    const run = wineSpawn([
      testFixturesDir("main-exec-with-worker-windows.js"),
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "hello from exec
      exec returned: 0
      done
      ",
      }
    `);
  }
);

test("worker throws during message handling, then main terminates", async () => {
  const run = spawn(binDir("qjs"), [testFixturesDir("main-worker-throws.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
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

test.runIf(shouldRunWineTests)(
  "[wine] worker throws during message handling, then main terminates",
  async () => {
    const run = wineSpawn([testFixturesDir("main-worker-throws.js")]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
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
  }
);
