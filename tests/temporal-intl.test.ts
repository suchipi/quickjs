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

test("local time in a zone outside upstream's test262 set", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const date = new Date(2017, 11, 12, 6, 0);
        console.log(date.toLocaleString("en-US"));
        console.log(Temporal.Now.timeZoneId());
        console.log(Temporal.ZonedDateTime.from("2017-12-12T06:00[America/Denver]").offset);
        console.log(Temporal.ZonedDateTime.from("2017-07-12T06:00[US/Mountain]").offset);
      `,
    ],
    { env: { ...process.env, TZ: "America/Denver" } }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "12/12/2017, 6:00:00 AM
    America/Denver
    -07:00
    -06:00
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
