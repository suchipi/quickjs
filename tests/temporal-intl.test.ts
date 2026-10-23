import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

test("Temporal and Intl in qjs", async () => {
  const run = spawn(binDir("qjs"), [fixturesDir("temporal-intl/globals.js")]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "object object
    1,234.5
    2026-02-01
    RangeError true
    ",
    }
  `);
});

test("Temporal and Intl in quickjs-run", async () => {
  const run = spawn(binDir("quickjs-run"), [
    fixturesDir("temporal-intl/globals.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "object object
    1,234.5
    2026-02-01
    RangeError true
    ",
    }
  `);
});

test("Temporal and Intl in a worker", async () => {
  const run = spawn(binDir("qjs"), [
    fixturesDir("temporal-intl/worker-main.js"),
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "worker: object object
    ",
    }
  `);
});
