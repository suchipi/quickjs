import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

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
