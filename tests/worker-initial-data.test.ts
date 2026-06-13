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

if (shouldRunWineTests) {
  setupWineHooks();
}

const workerInitialDataFixturesPath = fixturesDir.concat("worker-initial-data");

// The parent script is passed inline via `qjs -e` so the test reads top to
// bottom without jumping to a fixture file.
async function runInline(code: string) {
  const run = spawn(binDir("qjs"), ["-e", code], { cwd: rootDir() });
  await run.completion;
  return run.cleanResult();
}

async function runInlineWine(code: string) {
  const run = wineSpawn(["-e", code], { cwd: rootDir() });
  await run.completion;
  return run.cleanResult();
}

test("initialData is available synchronously and round-trips (no overrideCode)", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      const w = new Worker(${JSON.stringify(
        workerInitialDataFixturesPath("echo-worker.js")
      )}, {
        initialData: { message: "hello from parent", count: 42 },
      });
      w.onmessage = (event) => {
        console.log("parent received:", inspect(event.data));
        w.terminate();
      };
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "worker sees initialData: {
    	message: "hello from parent"
    	count: 42
    }
    parent received: {
    	message: "hello from parent"
    	count: 42
    }
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] initialData is available synchronously and round-trips (no overrideCode)",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        const w = new Worker(${JSON.stringify(
          workerInitialDataFixturesPath("echo-worker.js")
        )}, {
          initialData: { message: "hello from parent", count: 42 },
        });
        w.onmessage = (event) => {
          console.log("parent received:", inspect(event.data));
          w.terminate();
        };
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "worker sees initialData: {
      	message: "hello from parent"
      	count: 42
      }
      parent received: {
      	message: "hello from parent"
      	count: 42
      }
      ",
      }
    `);
  }
);

test("initialData is undefined when not provided", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      const entry = ${JSON.stringify(
        workerInitialDataFixturesPath("undefined-probe-worker.js")
      )};

      const noOptions = new Worker(entry);
      noOptions.onmessage = (noOptionsEvent) => {
        console.log("no options -> undefined:", noOptionsEvent.data.isUndefined);
        noOptions.terminate();

        const emptyOptions = new Worker(entry, {});
        emptyOptions.onmessage = (emptyOptionsEvent) => {
          console.log("empty options -> undefined:", emptyOptionsEvent.data.isUndefined);
          emptyOptions.terminate();
        };
      };
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "no options -> undefined: true
    empty options -> undefined: true
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] initialData is undefined when not provided",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        const entry = ${JSON.stringify(
          workerInitialDataFixturesPath("undefined-probe-worker.js")
        )};

        const noOptions = new Worker(entry);
        noOptions.onmessage = (noOptionsEvent) => {
          console.log("no options -> undefined:", noOptionsEvent.data.isUndefined);
          noOptions.terminate();

          const emptyOptions = new Worker(entry, {});
          emptyOptions.onmessage = (emptyOptionsEvent) => {
            console.log("empty options -> undefined:", emptyOptionsEvent.data.isUndefined);
            emptyOptions.terminate();
          };
        };
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "no options -> undefined: true
      empty options -> undefined: true
      ",
      }
    `);
  }
);

test("initialData uses structured clone (cycles, typed arrays, Date)", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      const cyclic = { bytes: new Uint8Array([1, 2, 3]), when: new Date(1000) };
      cyclic.self = cyclic;

      const w = new Worker(
        ${JSON.stringify(
          workerInitialDataFixturesPath("structured-clone-worker.js")
        )},
        { initialData: cyclic }
      );
      w.onmessage = (event) => {
        console.log("cycle preserved:", event.data.cyclePreserved);
        console.log("typed array is Uint8Array:", event.data.typedArrayIsUint8);
        console.log("typed array contents:", inspect(event.data.typedArrayContents));
        console.log("date is Date:", event.data.dateIsDate);
        console.log("date time:", event.data.dateTime);
        w.terminate();
      };
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "cycle preserved: true
    typed array is Uint8Array: true
    typed array contents: [
    	1
    	2
    	3
    ]
    date is Date: true
    date time: 1000
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] initialData uses structured clone (cycles, typed arrays, Date)",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        const cyclic = { bytes: new Uint8Array([1, 2, 3]), when: new Date(1000) };
        cyclic.self = cyclic;

        const w = new Worker(
          ${JSON.stringify(
            workerInitialDataFixturesPath("structured-clone-worker.js")
          )},
          { initialData: cyclic }
        );
        w.onmessage = (event) => {
          console.log("cycle preserved:", event.data.cyclePreserved);
          console.log("typed array is Uint8Array:", event.data.typedArrayIsUint8);
          console.log("typed array contents:", inspect(event.data.typedArrayContents));
          console.log("date is Date:", event.data.dateIsDate);
          console.log("date time:", event.data.dateTime);
          w.terminate();
        };
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "cycle preserved: true
      typed array is Uint8Array: true
      typed array contents: [
      	1
      	2
      	3
      ]
      date is Date: true
      date time: 1000
      ",
      }
    `);
  }
);

test("a SharedArrayBuffer in initialData is shared, not copied", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      const sab = new SharedArrayBuffer(8);
      const parentView = new Uint8Array(sab);

      const w = new Worker(${JSON.stringify(
        workerInitialDataFixturesPath("sab-worker.js")
      )}, {
        initialData: { sab },
      });
      w.onmessage = () => {
        console.log("parent reads byte written by worker:", parentView[0]);
        w.terminate();
      };
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "parent reads byte written by worker: 123
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] a SharedArrayBuffer in initialData is shared, not copied",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        const sab = new SharedArrayBuffer(8);
        const parentView = new Uint8Array(sab);

        const w = new Worker(${JSON.stringify(
          workerInitialDataFixturesPath("sab-worker.js")
        )}, {
          initialData: { sab },
        });
        w.onmessage = () => {
          console.log("parent reads byte written by worker:", parentView[0]);
          w.terminate();
        };
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "parent reads byte written by worker: 123
      ",
      }
    `);
  }
);

test("overrideCode and initialData work together", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      const source = \`
        import * as os from "quickjs:os";
        os.Worker.parent.postMessage("override saw: " + inspect(os.Worker.initialData));
      \`;
      const w = new Worker("/virtual/override-plus-data.js", {
        overrideCode: source,
        initialData: { from: "options" },
      });
      w.onmessage = (event) => {
        console.log("parent received:", event.data);
        w.terminate();
      };
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "parent received: override saw: {
    	from: "options"
    }
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] overrideCode and initialData work together",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        const source = \`
          import * as os from "quickjs:os";
          os.Worker.parent.postMessage("override saw: " + inspect(os.Worker.initialData));
        \`;
        const w = new Worker("/virtual/override-plus-data.js", {
          overrideCode: source,
          initialData: { from: "options" },
        });
        w.onmessage = (event) => {
          console.log("parent received:", event.data);
          w.terminate();
        };
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "parent received: override saw: {
      	from: "options"
      }
      ",
      }
    `);
  }
);

test("non-clonable initialData throws at construction time", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      try {
        new Worker(${JSON.stringify(
          workerInitialDataFixturesPath("echo-worker.js")
        )}, {
          initialData: { fn: () => {} },
        });
        console.log("no error thrown (unexpected)");
      } catch (err) {
        console.log("threw:", err instanceof Error);
        console.log("name:", err.name);
      }
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "threw: true
    name: TypeError
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] non-clonable initialData throws at construction time",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        try {
          new Worker(${JSON.stringify(
            workerInitialDataFixturesPath("echo-worker.js")
          )}, {
            initialData: { fn: () => {} },
          });
          console.log("no error thrown (unexpected)");
        } catch (err) {
          console.log("threw:", err instanceof Error);
          console.log("name:", err.name);
        }
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "threw: true
      name: TypeError
      ",
      }
    `);
  }
);

test("a non-object options argument throws a TypeError", async () => {
  expect(
    await runInline(`
      const { Worker } = require("quickjs:os");
      try {
        new Worker(${JSON.stringify(
          workerInitialDataFixturesPath("echo-worker.js")
        )}, 42);
        console.log("no error thrown (unexpected)");
      } catch (err) {
        console.log("threw:", err instanceof Error);
        console.log("name:", err.name);
        console.log("message:", err.message);
      }
    `)
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "threw: true
    name: TypeError
    message: Worker options must be an object
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] a non-object options argument throws a TypeError",
  async () => {
    expect(
      await runInlineWine(`
        const { Worker } = require("quickjs:os");
        try {
          new Worker(${JSON.stringify(
            workerInitialDataFixturesPath("echo-worker.js")
          )}, 42);
          console.log("no error thrown (unexpected)");
        } catch (err) {
          console.log("threw:", err instanceof Error);
          console.log("name:", err.name);
          console.log("message:", err.message);
        }
      `)
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "threw: true
      name: TypeError
      message: Worker options must be an object
      ",
      }
    `);
  }
);
