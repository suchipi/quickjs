import { test, beforeEach, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "first-base";
import { binDir, fixturesDir, rootDir } from "./_utils";

// Coverage of every meaningful combination of:
//   {how a promise rejects} × {how it's handled or not}
//   × {which loading path was used to get the JS into the engine}
//   × {which JS-running binary the fork ships}.
//
// Engine-side fixes that this matrix validates (commit 4710132):
//   1. js_async_function_call_internal(mark_handled=TRUE) for the
//      promise that wraps a sync module body, so a sync throw inside a
//      module that's being require()'d doesn't fire the host's
//      unhandled-rejection tracker.
//   2. js_evaluate_module_async(mark_handled=TRUE) for the sync
//      wrapper's m->promise, same reason.
//   3. fulfill_or_reject_promise defers the tracker call to a microtask
//      via JS_EnqueueJob, re-checking is_handled, so a same-tick
//      .catch / await / .then(handler) suppresses it.
//
// The four JS-running binaries:
//   - qjs                   src/programs/qjs/qjs.c
//   - quickjs-run           src/programs/quickjs-run/quickjs-run.c
//   - qjsbootstrap          src/programs/qjsbootstrap/qjsbootstrap.c (source-appended)
//   - qjsbootstrap-bytecode src/programs/qjsbootstrap/qjsbootstrap.c (bytecode-appended)
//
// stack-limit-test runs hardcoded bytecode and isn't generally programmable, skip.

// ============================================================================
// runEverywhere: run a snippet through every binary, assert all four
// produce identical (cleaned) output, and return that output for snapshot
// assertion.
// ============================================================================

const workDir = rootDir("build/tests/unhandled-rejection");

beforeEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
});

async function compileToBytecode(sourceFile: string, outFile: string) {
  const run = spawn(
    binDir("quickjs-run"),
    [
      binDir("file-to-bytecode.js"),
      sourceFile,
      outFile,
      path.basename(sourceFile),
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  if (run.result.code !== 0) {
    throw new Error(
      `file-to-bytecode failed: ${JSON.stringify(run.result, null, 2)}`
    );
  }
}

function makeBootstrapProg(sourceFile: string, progName: string): string {
  const progPath = path.join(workDir, progName);
  fs.copyFileSync(binDir("qjsbootstrap"), progPath);
  fs.appendFileSync(progPath, fs.readFileSync(sourceFile));
  fs.chmodSync(progPath, 0o755);
  return progPath;
}

async function makeBytecodeBootstrapProg(
  sourceFile: string,
  progName: string
): Promise<string> {
  const bytecodePath = path.join(workDir, progName + ".bin");
  await compileToBytecode(sourceFile, bytecodePath);
  const progPath = path.join(workDir, progName);
  fs.copyFileSync(binDir("qjsbootstrap-bytecode"), progPath);
  fs.appendFileSync(progPath, fs.readFileSync(bytecodePath));
  fs.chmodSync(progPath, 0o755);
  return progPath;
}

type CleanResult = ReturnType<ReturnType<typeof spawn>["cleanResult"]>;

// Run a single .mjs file through all four binaries (qjs, quickjs-run,
// qjsbootstrap, qjsbootstrap-bytecode) and return a record of each
// binary's cleaned result. Use the per-binary result map as a snapshot
// when you expect uniform behavior — divergences will jump out in the
// diff. For divergence-tolerant tests, snapshot each entry separately.
async function runEverywhere(fixturePath: string, progName: string) {
  // qjs <file.mjs>
  const qjsRun = spawn(binDir("qjs"), [fixturePath]);
  await qjsRun.completion;

  // quickjs-run <file>
  const quickjsRun = spawn(binDir("quickjs-run"), [fixturePath]);
  await quickjsRun.completion;

  // qjsbootstrap with source appended
  const sourceProg = makeBootstrapProg(fixturePath, progName + "-source");
  const bootstrapRun = spawn(sourceProg);
  await bootstrapRun.completion;

  // qjsbootstrap-bytecode with bytecode appended
  const bytecodeProg = await makeBytecodeBootstrapProg(
    fixturePath,
    progName + "-bytecode"
  );
  const bootstrapBytecodeRun = spawn(bytecodeProg);
  await bootstrapBytecodeRun.completion;

  return {
    qjs: qjsRun.cleanResult(),
    "quickjs-run": quickjsRun.cleanResult(),
    qjsbootstrap: bootstrapRun.cleanResult(),
    "qjsbootstrap-bytecode": bootstrapBytecodeRun.cleanResult(),
  };
}

// ============================================================================
// Group A: inline `-e` snippets (qjs only)
// ============================================================================

test("A1: Promise.reject with sync .catch attached → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `Promise.reject(new Error("a1")).catch(e => console.log("caught:", e.message));`,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a1
    ",
    }
  `);
});

test("A2: Promise.reject with no handler → exits 1, reported", async () => {
  const run = spawn(binDir("qjs"), ["-e", `Promise.reject(new Error("a2"));`]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a2
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A3: Promise.reject with .catch attached after a setTimeout (post-microtask) → exits 1, reported", async () => {
  // The deferral the engine does is *one microtask*, not a full event-loop turn.
  // Attaching the .catch from a setTimeout(0) callback is too late: the tracker
  // has already fired by then. This pins that behavior.
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const p = Promise.reject(new Error("a3"));
      setTimeout(() => { p.catch(() => {}); }, 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a3
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A4: new Promise((_, rej) => rej(err)) with immediate .then(undefined, handler) → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const p = new Promise((_, rej) => rej(new Error("a4")));
      p.then(undefined, e => console.log("caught:", e.message));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a4
    ",
    }
  `);
});

test("A5: async function that throws synchronously, called without .catch → exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      async function f() { throw new Error("a5"); }
      f();
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a5
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A6: async function that throws synchronously, called with .catch → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      async function f() { throw new Error("a6"); }
      f().catch(e => console.log("caught:", e.message));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a6
    ",
    }
  `);
});

test("A7: await Promise.reject in async IIFE wrapped in try/catch → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      (async () => {
        try {
          await Promise.reject(new Error("a7"));
        } catch (e) {
          console.log("caught:", e.message);
        }
      })();
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a7
    ",
    }
  `);
});

test("A8: await Promise.reject in async IIFE NOT wrapped → exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      (async () => {
        await Promise.reject(new Error("a8"));
      })();
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a8
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A9: chain Promise.reject(a).catch(()=>Promise.reject(b)) — second is unhandled → exits 1, b reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.reject(new Error("a9-first")).catch(() => Promise.reject(new Error("a9-second")));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a9-second
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A10: Promise.reject with .then(noopHandler) only (no rejection handler) → exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.reject(new Error("a10")).then(() => {});
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a10
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("A11: Promise.reject with .then(noopHandler, rejectionHandler) → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.reject(new Error("a11")).then(() => {}, e => console.log("caught:", e.message));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a11
    ",
    }
  `);
});

test("A12: Promise.reject created inside setTimeout, no handler → exits 1, reported after timer fires", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      console.log("before setTimeout");
      setTimeout(() => {
        console.log("inside setTimeout");
        Promise.reject(new Error("a12"));
      }, 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: a12
        at somewhere

    ",
      "stdout": "before setTimeout
    inside setTimeout
    ",
    }
  `);
});

test("A13: Promise.reject inside setTimeout, .catch attached in same callback → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      setTimeout(() => {
        Promise.reject(new Error("a13")).catch(e => console.log("caught:", e.message));
      }, 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: a13
    ",
    }
  `);
});

// ============================================================================
// Group B: module-loading patterns, run across all four binaries
// ============================================================================

test("B14: ESM main entry — TLA reject, caught by try/catch → not reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "esm-tla-reject-caught.mjs"),
    "b14"
  );
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: tla-caught
    ",
      },
      "qjsbootstrap": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: tla-caught
    ",
      },
      "qjsbootstrap-bytecode": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: tla-caught
    ",
      },
      "quickjs-run": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: tla-caught
    ",
      },
    }
  `);
});

test("B15: ESM main entry — TLA reject, NOT caught → exits 1", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "esm-tla-reject-uncaught.mjs"),
    "b15"
  );
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "Error: tla-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Error: tla-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Error: tla-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "Error: tla-uncaught
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B16: ESM main entry — synchronous throw at top level → exits 1", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "esm-sync-throw.mjs"),
    "b16"
  );
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "Error: esm-sync-throw
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Error: esm-sync-throw
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Error: esm-sync-throw
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "Error: esm-sync-throw
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B17: ESM main entry — sync Promise.reject, no handler → exits 1, reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "esm-sync-promise-reject.mjs"),
    "b17"
  );
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "Possibly unhandled promise rejection: Error: sync-pr-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Possibly unhandled promise rejection: Error: sync-pr-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Possibly unhandled promise rejection: Error: sync-pr-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "Possibly unhandled promise rejection: Error: sync-pr-uncaught
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B18: ESM main entry — sync Promise.reject with .catch → not reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "esm-sync-promise-reject-caught.mjs"),
    "b18"
  );
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: sync-pr-caught
    ",
      },
      "qjsbootstrap": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: sync-pr-caught
    ",
      },
      "qjsbootstrap-bytecode": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: sync-pr-caught
    ",
      },
      "quickjs-run": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: sync-pr-caught
    ",
      },
    }
  `);
});

test("B19: ESM main entry — dynamic import() of TLA-reject, caught → not reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "import-tla-reject-caught.mjs"),
    "b19"
  );
  // NOTE(qjsbootstrap-design): qjsbootstrap (both source and bytecode)
  // anchors relative imports at the bootstrap binary's location. The
  // fixture's `../tla/...` path resolves from build/tests/.../bN-source
  // rather than from the original fixture location — so the file isn't
  // there and the resolver legitimately fails. Caught by the user.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: oops from tla-reject-uncaught
    ",
      },
      "qjsbootstrap": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve '../tla/tla-reject-uncaught.mjs' from '<rootDir>/build/tests/unhandled-rejection/b19-source': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
    ",
      },
      "qjsbootstrap-bytecode": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve '../tla/tla-reject-uncaught.mjs' from '<rootDir>/build/tests/unhandled-rejection/b19-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
    ",
      },
      "quickjs-run": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: oops from tla-reject-uncaught
    ",
      },
    }
  `);
});

test("B20: ESM main entry — dynamic import() of TLA-reject, NOT caught → exits 1", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "import-tla-reject-uncaught.mjs"),
    "b20"
  );
  // NOTE(qjsbootstrap-design): same path-resolution explanation as B19.
  // The "Caused by: Error: <message>" line on the bootstrap variants is
  // produced by module-impl.js's resolver wrapping the inner "No such
  // file" error.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve '../tla/tla-reject-uncaught.mjs' from '<rootDir>/build/tests/unhandled-rejection/b20-source': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve '../tla/tla-reject-uncaught.mjs' from '<rootDir>/build/tests/unhandled-rejection/b20-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-reject-uncaught.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B21: ESM main entry — require() of throwing module, caught → not reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "require-throws-caught.mjs"),
    "b21"
  );
  // NOTE(qjsbootstrap-design): same path-resolution explanation as B19.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: dep-esm-throws
    ",
      },
      "qjsbootstrap": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve './esm-throws.mjs' from '<rootDir>/build/tests/unhandled-rejection/b21-source': No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
    ",
      },
      "qjsbootstrap-bytecode": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve './esm-throws.mjs' from '<rootDir>/build/tests/unhandled-rejection/b21-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
    ",
      },
      "quickjs-run": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: dep-esm-throws
    ",
      },
    }
  `);
});

test("B22: ESM main entry — require() of throwing module, NOT caught → exits 1", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "require-throws-uncaught.mjs"),
    "b22"
  );
  // NOTE(qjsbootstrap-design): same path-resolution explanation as B19.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "Error: dep-esm-throws
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve './esm-throws.mjs' from '<rootDir>/build/tests/unhandled-rejection/b22-source': No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve './esm-throws.mjs' from '<rootDir>/build/tests/unhandled-rejection/b22-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/./esm-throws.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "Error: dep-esm-throws
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B23a: ESM main entry — require() of TLA module, caught → not reported", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "require-tla-caught.mjs"),
    "b23a"
  );
  // NOTE(qjsbootstrap-design): same path-resolution explanation as B19.
  // The bootstrap variants never get to the "cannot synchronously load
  // TLA" code path because the file isn't reachable from their anchor.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
    ",
      },
      "qjsbootstrap": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve '../tla/tla-basic.mjs' from '<rootDir>/build/tests/unhandled-rejection/b23a-source': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
    ",
      },
      "qjsbootstrap-bytecode": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: Failed to resolve '../tla/tla-basic.mjs' from '<rootDir>/build/tests/unhandled-rejection/b23a-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
    ",
      },
      "quickjs-run": {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught: cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
    ",
      },
    }
  `);
});

test("B23b: ESM main entry — require() of TLA module, NOT caught → exits 1 with TypeError", async () => {
  const result = await runEverywhere(
    fixturesDir("unhandled-rejection", "require-tla-uncaught.mjs"),
    "b23b"
  );
  // NOTE(qjsbootstrap-design): same path-resolution explanation as B19.
  expect(result).toMatchInlineSnapshot(`
    {
      "qjs": {
        "code": 1,
        "error": null,
        "stderr": "TypeError: cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve '../tla/tla-basic.mjs' from '<rootDir>/build/tests/unhandled-rejection/b23b-source': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "qjsbootstrap-bytecode": {
        "code": 1,
        "error": null,
        "stderr": "Error: Failed to resolve '../tla/tla-basic.mjs' from '<rootDir>/build/tests/unhandled-rejection/b23b-bytecode': No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
        at somewhere
    Caused by: Error: No such file: '<rootDir>/build/tests/unhandled-rejection/../tla/tla-basic.mjs' (using search extensions: [".js"])
        at somewhere

    ",
        "stdout": "",
      },
      "quickjs-run": {
        "code": 1,
        "error": null,
        "stderr": "TypeError: cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
        at somewhere

    ",
        "stdout": "",
      },
    }
  `);
});

test("B25: ESM main entry — engine.importModule() of TLA module, caught → not reported (qjs only — fixture imports quickjs:engine which only qjs has)", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "engine-importModule-tla.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: TypeError cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
    ",
    }
  `);
});

// ============================================================================
// Group C: deferred / microtask edge cases
// ============================================================================

test("C26: two unhandled rejections in same tick → both reported, then exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.reject(new Error("c26-first"));
      Promise.reject(new Error("c26-second"));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: c26-first
        at somewhere

    Possibly unhandled promise rejection: Error: c26-second
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("C27a: rejection inside async generator, iterated with try/catch → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      async function* gen() {
        yield 1;
        throw new Error("c27a");
      }
      (async () => {
        try {
          for await (const v of gen()) {
            console.log("v:", v);
          }
        } catch (e) {
          console.log("caught:", e.message);
        }
      })();
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "v: 1
    caught: c27a
    ",
    }
  `);
});

test("C27b: rejection inside async generator, iterated WITHOUT try/catch → exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      async function* gen() {
        yield 1;
        throw new Error("c27b");
      }
      (async () => {
        for await (const v of gen()) {
          console.log("v:", v);
        }
      })();
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: c27b
        at somewhere

    ",
      "stdout": "v: 1
    ",
    }
  `);
});

test("C28: Promise.allSettled([reject(a), reject(b)]) — internal handlers attach in time → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.allSettled([
        Promise.reject(new Error("c28-a")),
        Promise.reject(new Error("c28-b")),
      ]).then(results => console.log("settled:", results.map(r => r.status + ":" + (r.reason && r.reason.message))));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "settled: [ "rejected:c28-a", "rejected:c28-b" ]
    ",
    }
  `);
});

test("C29: Promise.all([reject(a), resolve(b)]) with .catch on result → not reported", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.all([
        Promise.reject(new Error("c29")),
        Promise.resolve(1),
      ]).catch(e => console.log("caught:", e.message));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: c29
    ",
    }
  `);
});

test("C30: Promise.all([reject(a), resolve(b)]) with NO handler → exits 1", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Promise.all([
        Promise.reject(new Error("c30")),
        Promise.resolve(1),
      ]);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Possibly unhandled promise rejection: Error: c30
        at somewhere

    ",
      "stdout": "",
    }
  `);
});
