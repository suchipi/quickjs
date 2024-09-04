import { spawn } from "first-base";
import { binDir } from "./_utils";

// GitHub actions CPU is slow enough that these aren't deterministic unless we
// make all the timings longer
const WAIT_TIME_MULTIPLIER = process.env.CI ? 10 : 1;

test("setInterval and clearInterval are present", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        console.log(typeof setInterval, typeof clearInterval);
        const interval = setInterval(() => {});
        console.log(interval);
        clearInterval(interval);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "function function
    [object Object]
    ",
    }
  `);
});

test("setTimeout and setInterval work", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        let i = 0;
        setInterval(() => {
          console.log("hello!", i++);
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello! 0
    hello! 1
    hello! 2
    exiting
    ",
    }
  `);
});

test("setInterval callback continues to re-run even if it errors", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        setInterval(() => {
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "Error: uh oh! an error!
    Error: uh oh! an error!
    Error: uh oh! an error!
    ",
      "stdout": "exiting
    ",
    }
  `);
});

test("failure in setInterval callback uses console.error", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const receivedArgs = [];
        console.error = (...args) => {
          receivedArgs.push(args);
        };

        setInterval(() => {
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("receivedArgs.length:", receivedArgs.length);
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "receivedArgs.length: 3
    exiting
    ",
    }
  `);
});

test("setInterval callback falls back to print if console.error isn't present", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        let timesPrintCalled = 0;
        const originalPrint = globalThis.print;
        globalThis.print = (...args) => {
          timesPrintCalled++;
          return originalPrint(...args);
        };

        delete console.error;

        let timesIntervalCallbackRan = 0;
        setInterval(() => {
          timesIntervalCallbackRan++;
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("times print called:", timesPrintCalled);
          console.log("times interval callback ran:", timesIntervalCallbackRan);
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Error: uh oh! an error!
    Error: uh oh! an error!
    Error: uh oh! an error!
    times print called: 3
    times interval callback ran: 3
    exiting
    ",
    }
  `);
});

test("setInterval callback falls back to print if console.error errors", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        let timesPrintCalled = 0;
        const originalPrint = globalThis.print;
        globalThis.print = (...args) => {
          timesPrintCalled++;
          return originalPrint(...args);
        };

        console.error = () => {
          throw new Error("So, SO sad!");
        }

        let timesIntervalCallbackRan = 0;
        setInterval(() => {
          timesIntervalCallbackRan++;
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("times print called:", timesPrintCalled);
          console.log("times interval callback ran:", timesIntervalCallbackRan);
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Error: uh oh! an error!
    Error: uh oh! an error!
    Error: uh oh! an error!
    times print called: 3
    times interval callback ran: 3
    exiting
    ",
    }
  `);
});

test("setInterval callback still runs even if console.error and print aren't available", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        delete globalThis.print;
        delete console.error;

        let timesIntervalCallbackRan = 0;
        setInterval(() => {
          timesIntervalCallbackRan++;
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("times interval callback ran:", timesIntervalCallbackRan);
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "times interval callback ran: 3
    exiting
    ",
    }
  `);
});

test("setInterval callback still runs even if console.error and print both fail", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        globalThis.print = () => {
          throw new Error("So, SO sad!");
        };
        console.error = () => {
          throw new Error("So, SO sad!");
        };

        let timesIntervalCallbackRan = 0;
        setInterval(() => {
          timesIntervalCallbackRan++;
          throw new Error("uh oh! an error!");
        }, ${40 * WAIT_TIME_MULTIPLIER});

        setTimeout(() => {
          console.log("times interval callback ran:", timesIntervalCallbackRan);
          console.log("exiting");
          require("quickjs:std").exit(0);
        }, ${150 * WAIT_TIME_MULTIPLIER});
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "times interval callback ran: 3
    exiting
    ",
    }
  `);
});
