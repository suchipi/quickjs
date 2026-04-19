import { test, beforeEach, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "first-base";
import { binDir, fixturesDir, rootDir } from "./_utils";

// All fixtures live in tests/fixtures/tla/. Each test spawns build/bin/qjs
// with the fixture as the entry module. The fork's async-aware main entry
// supports top-level await; synchronous APIs (require, engine.importModule)
// refuse TLA modules with a TypeError per the Zalgo-safe design.

test("TLA works from main entry (qjs <file.mjs>)", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("tla", "tla-basic.mjs")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "tla-basic: 42
    ",
    }
  `);
});

test("TLA works via dynamic import()", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("tla", "dyn-import-tla.mjs")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "tla-basic: 42
    dyn-import got: 42
    ",
    }
  `);
});

test("require() on a TLA module throws TypeError synchronously", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "require-tla-uncaught.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "TypeError: cannot synchronously load module '<rootDir>/tests/fixtures/tla/tla-basic.mjs' because it uses top-level await
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("require() TLA error is catchable and exits cleanly", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("tla", "require-tla.mjs")]);
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

test("engine.importModule on a TLA module throws TypeError synchronously", async () => {
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

test("require() on a non-TLA module still works (no regression)", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "require-nontla.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "nontla loaded
    require returned value: 7
    ",
    }
  `);
});

test("TLA rejection is catchable via try/catch", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("tla", "tla-reject.mjs")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: Error oops from tla-reject
    ",
    }
  `);
});

// An uncaught top-level rejection should be indistinguishable, from the
// module author's perspective, from a sync `throw` in a non-TLA module:
// printed to stderr and nonzero exit. Not silently swallowed as an
// "unhandled rejection."
test("uncaught TLA rejection prints and exits nonzero (not silent)", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "tla-reject-uncaught.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("module cycle containing TLA resolves correctly", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("tla", "cycle-entry.mjs")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "cycle-b done, got aNS: object
    cycle-a done, saw b = B
    cycle loaded, aNS keys = a bNS keys = b
    ",
    }
  `);
});

// ============================================================================
// ModuleDelegate contract preservation — fork-specific, ensures the delegate
// hooks (.read, .resolve, .compilers) remain synchronous and continue to
// drive both the sync and async evaluators identically.
// ============================================================================

test("ModuleDelegate.read returning TLA source — async path succeeds", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "delegate-read-tla-async.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "got from virtual TLA module: from-virtual
    ",
    }
  `);
});

test("ModuleDelegate.read returning TLA source — sync path throws with virtual name", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "delegate-read-tla-sync.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: TypeError cannot synchronously load module 'virtual:tla' because it uses top-level await
    ",
    }
  `);
});

test("ModuleDelegate.compilers output containing TLA — async resolves, sync throws", async () => {
  const runAsync = spawn(binDir("qjs"), [
    fixturesDir("tla", "delegate-compiler-tla.mjs"),
    "async",
  ]);
  await runAsync.completion;
  expect(runAsync.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "async got value: plain tla source
    ",
    }
  `);

  const runSync = spawn(binDir("qjs"), [
    fixturesDir("tla", "delegate-compiler-tla.mjs"),
    "sync",
  ]);
  await runSync.completion;
  expect(runSync.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "sync caught: TypeError cannot synchronously load module '<rootDir>/tests/fixtures/tla/plain.tla-mjs' because it uses top-level await
    ",
    }
  `);
});

test("ModuleDelegate.resolve called synchronously during async module linking", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("tla", "delegate-resolve-count.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "got: wrapper:dep-ok
    resolve calls:
      ./delegate-tla-with-dep.mjs from ./delegate-resolve-count.mjs
      ./delegate-resolve-count-dep.mjs from ./delegate-tla-with-dep.mjs
    ",
    }
  `);
});

// ============================================================================
// Cross-binary coverage: the TLA feature and the rejection-propagation
// behavior must match across every binary that runs user code as the entry
// module — qjs, quickjs-run, qjsbootstrap (source), qjsbootstrap-bytecode.
// The "same behavior" contract is: TLA succeeds exit 0 with stdout; TLA
// rejection prints to stderr and exits 1.
// ============================================================================

test("TLA works with quickjs-run", async () => {
  const run = spawn(binDir("quickjs-run"), [fixturesDir("tla", "tla-basic.mjs")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "tla-basic: 42
    ",
    }
  `);
});

test("uncaught TLA rejection with quickjs-run prints and exits nonzero", async () => {
  const run = spawn(binDir("quickjs-run"), [
    fixturesDir("tla", "tla-reject-uncaught.mjs"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

// qjsbootstrap (source): cp the bootstrap binary, append JS module source,
// run. The source is treated as a module, so top-level await works.
const bootstrapWorkDir = rootDir("build/tests/qjsbootstrap-tla");

function makeBootstrapProg(sourceFile: string, progName: string) {
  const progPath = path.join(bootstrapWorkDir, progName);
  fs.rmSync(progPath, { force: true });
  const source = fs.readFileSync(sourceFile);
  fs.copyFileSync(binDir("qjsbootstrap"), progPath);
  fs.appendFileSync(progPath, source);
  fs.chmodSync(progPath, 0o755);
  return progPath;
}

beforeEach(() => {
  fs.rmSync(bootstrapWorkDir, { recursive: true, force: true });
  fs.mkdirSync(bootstrapWorkDir, { recursive: true });
});

test("TLA works with qjsbootstrap (appended source)", async () => {
  const prog = makeBootstrapProg(
    fixturesDir("tla", "tla-basic.mjs"),
    "tla-ok"
  );
  const run = spawn(prog);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "tla-basic: 42
    ",
    }
  `);
});

test("uncaught TLA rejection with qjsbootstrap prints and exits nonzero", async () => {
  const prog = makeBootstrapProg(
    fixturesDir("tla", "tla-reject-uncaught.mjs"),
    "tla-reject"
  );
  const run = spawn(prog);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

// qjsbootstrap-bytecode: compile a TLA fixture to bytecode via the
// file-to-bytecode.js helper, then cp qjsbootstrap-bytecode and append.
async function compileToBytecode(sourceFile: string, outFile: string) {
  const run = spawn(
    binDir("quickjs-run"),
    [binDir("file-to-bytecode.js"), sourceFile, outFile, path.basename(sourceFile)],
    { cwd: rootDir() }
  );
  await run.completion;
  if (run.result.code !== 0) {
    throw new Error(
      `file-to-bytecode failed: ${JSON.stringify(run.result, null, 2)}`
    );
  }
}

async function makeBytecodeBootstrapProg(
  sourceFile: string,
  progName: string
) {
  const bytecodePath = path.join(bootstrapWorkDir, progName + ".bin");
  await compileToBytecode(sourceFile, bytecodePath);
  const bytecode = fs.readFileSync(bytecodePath);
  const progPath = path.join(bootstrapWorkDir, progName);
  fs.copyFileSync(binDir("qjsbootstrap-bytecode"), progPath);
  fs.appendFileSync(progPath, bytecode);
  fs.chmodSync(progPath, 0o755);
  return progPath;
}

test("TLA works with qjsbootstrap-bytecode (appended bytecode)", async () => {
  const prog = await makeBytecodeBootstrapProg(
    fixturesDir("tla", "tla-basic.mjs"),
    "tla-ok"
  );
  const run = spawn(prog);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "tla-basic: 42
    ",
    }
  `);
});

test("uncaught TLA rejection with qjsbootstrap-bytecode prints and exits nonzero", async () => {
  const prog = await makeBytecodeBootstrapProg(
    fixturesDir("tla", "tla-reject-uncaught.mjs"),
    "tla-reject"
  );
  const run = spawn(prog);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: oops from tla-reject-uncaught
        at somewhere

    ",
      "stdout": "",
    }
  `);
});
