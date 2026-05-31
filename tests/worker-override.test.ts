import { test, expect } from "vitest";
import { spawn } from "first-base";
import {
  binDir,
  fixturesDir,
  setupWineHooks,
  shouldRunWineTests,
  wineSpawn,
} from "./_utils";

const f = fixturesDir.concat("worker-override");

if (shouldRunWineTests) {
  setupWineHooks();
}

async function runFixture(...parts: Array<string>) {
  const run = spawn(binDir("qjs"), [f(...parts)], { cwd: __dirname });
  await run.completion;
  return run.cleanResult();
}

async function runFixtureWine(...parts: Array<string>) {
  const run = wineSpawn([f(...parts)], { cwd: __dirname });
  await run.completion;
  return run.cleanResult();
}

test("synthetic worker round-trips a posted message", async () => {
  expect(await runFixture("basic.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "parent received: got: ping
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] synthetic worker round-trips a posted message",
  async () => {
    expect(await runFixtureWine("basic.js")).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "parent received: got: ping
      ",
      }
    `);
  }
);

test("import.meta.url reflects the fake filename", async () => {
  expect(await runFixture("import-meta.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "import.meta.url: file:///virtual/some-name.js
    ends with fake name: true
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] import.meta.url reflects the fake filename",
  async () => {
    expect(await runFixtureWine("import-meta.js")).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "import.meta.url: file:///virtual/some-name.js
      ends with fake name: true
      ",
      }
    `);
  }
);

test("relative import from synthetic module resolves against the fake dir", async () => {
  expect(
    await runFixture("relative-import", "main.js")
  ).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "imported value: from-helper
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] relative import from synthetic module resolves against the fake dir",
  async () => {
    expect(
      await runFixtureWine("relative-import", "main.js")
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "imported value: from-helper
      ",
      }
    `);
  }
);

test("synchronous top-level throw reaches parent onerror", async () => {
  expect(await runFixture("top-level-throw.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error instanceof Error: true
    error.message: synthetic boom
    filename ends with fake: true
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] synchronous top-level throw reaches parent onerror",
  async () => {
    expect(await runFixtureWine("top-level-throw.js")).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "error instanceof Error: true
      error.message: synthetic boom
      filename ends with fake: true
      ",
      }
    `);
  }
);

test("async (top-level-await) throw reaches parent onerror", async () => {
  expect(await runFixture("top-level-throw-async.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "error instanceof Error: true
    error.message: synthetic tla boom
    filename ends with fake: true
    ",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] async (top-level-await) throw reaches parent onerror",
  async () => {
    expect(
      await runFixtureWine("top-level-throw-async.js")
    ).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "error instanceof Error: true
      error.message: synthetic tla boom
      filename ends with fake: true
      ",
      }
    `);
  }
);

test("empty override string is a valid empty module", async () => {
  expect(await runFixture("empty-override.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test.runIf(shouldRunWineTests)(
  "[wine] empty override string is a valid empty module",
  async () => {
    expect(await runFixtureWine("empty-override.js")).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  }
);
