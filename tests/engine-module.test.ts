import { spawn } from "first-base";
import { binDir, rootDir, fixturesDir } from "./_utils";

// =========== evalScript ===========

test("engine.evalScript - basic evaluation", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { evalScript } from "quickjs:engine";
      const result = evalScript("2 + 3");
      console.log("result:", result);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "result: 5
    ",
    }
  `);
});

test("engine.evalScript - with filename option", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { evalScript } from "quickjs:engine";
      try {
        evalScript("throw new Error('test')", { filename: "my-script.js" });
      } catch(e) {
        console.log(e.stack);
      }
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "    at <eval> (my-script.js)
        at evalScript (native)
        at <anonymous> (<cmdline>:4)

    ",
    }
  `);
});

test("engine.evalScript - with backtraceBarrier option", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { evalScript } from "quickjs:engine";
      try {
        evalScript("throw new Error('test')", { backtraceBarrier: true });
      } catch(e) {
        console.log(e.stack);
      }
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "    at <eval> (<evalScript>)

    ",
    }
  `);
});

// =========== runScript ===========

test("engine.runScript - executes a script file", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { runScript } from "quickjs:engine";
        runScript("tests/fixtures/log-four.js");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);
});

// =========== importModule ===========

test("engine.importModule - synchronous dynamic import", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { importModule } from "quickjs:engine";
        const mod = importModule("./tests/fixtures/exports-five.js");
        console.log("five:", mod.five);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "exporting 5
    five: 5
    ",
    }
  `);
});

test("engine.importModule - with basename", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { importModule } from "quickjs:engine";
        const mod = importModule("./exports-five.js", ${JSON.stringify(
          fixturesDir("dummy")
        )});
        console.log("five:", mod.five);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "exporting 5
    five: 5
    ",
    }
  `);
});

// =========== resolveModule ===========

test("engine.resolveModule - resolves module path", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { resolveModule } from "quickjs:engine";
        const resolved = resolveModule("./tests/fixtures/log-four.js");
        console.log("ends with:", resolved.endsWith("tests/fixtures/log-four.js"));
        console.log("absolute:", resolved.startsWith("/"));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "ends with: true
    absolute: true
    ",
    }
  `);
});

test("engine.resolveModule - with basename", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { resolveModule } from "quickjs:engine";
        const resolved = resolveModule("./log-four.js", ${JSON.stringify(
          fixturesDir("dummy")
        )});
        console.log("ends with:", resolved.endsWith("tests/fixtures/log-four.js"));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "ends with: true
    ",
    }
  `);
});

// =========== getFileNameFromStack ===========

test("engine.getFileNameFromStack - returns current filename", async () => {
  const run = spawn(
    binDir("qjs"),
    [fixturesDir("get-filename-from-stack.js")],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result.code).toBe(0);
  expect(run.result.stdout).toContain("level0:");
  expect(run.result.stdout).toContain("get-filename-from-stack.js");
  expect(run.result.stdout).toContain("level1 error:");
});

// =========== gc ===========

test("engine.gc - runs without error", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { gc } from "quickjs:engine";
      // Create some garbage
      for (let i = 0; i < 100; i++) {
        const obj = { data: new ArrayBuffer(1000) };
      }
      gc();
      console.log("gc completed");
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "gc completed
    ",
    }
  `);
});

// =========== ModuleDelegate.resolve ===========

test("engine.ModuleDelegate.resolve - custom resolution", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import { ModuleDelegate } from "quickjs:engine";

        const originalResolve = ModuleDelegate.resolve;

        ModuleDelegate.resolve = (name, fromFile) => {
          if (name === "my-alias") {
            return ${JSON.stringify(fixturesDir("log-four.js"))};
          }
          return originalResolve(name, fromFile);
        };

        require("my-alias");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);
});

// =========== isMainModule, setMainModule ===========

test("engine.isMainModule and setMainModule", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      import { isMainModule, setMainModule } from "quickjs:engine";

      console.log("before:", isMainModule("/some/fake/path.js"));

      setMainModule("/some/fake/path.js");
      console.log("after:", isMainModule("/some/fake/path.js"));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "before: false
    after: true
    ",
    }
  `);
});

// =========== isModuleNamespace ===========

test("engine.isModuleNamespace - checks module namespace", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-m",
      "-e",
      `
        import * as engine from "quickjs:engine";
        console.log("namespace:", engine.isModuleNamespace(engine));
        console.log("object:", engine.isModuleNamespace({}));
        console.log("null:", engine.isModuleNamespace(null));
        console.log("number:", engine.isModuleNamespace(42));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "namespace: true
    object: false
    null: false
    number: false
    ",
    }
  `);
});
