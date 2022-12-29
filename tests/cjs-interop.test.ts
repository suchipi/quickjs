import { spawn } from "first-base";
import { binDir } from "./_utils";

describe("require", () => {
  test("file without __cjsExports - returns ns", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          const res = require("./fixtures/without-cjs-export");

          console.log(JSON.stringify([
            res instanceof Module,
            Object.keys(res),
            res.default(),
          ], null, 2));
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
        "stdout": "[
        true,
        [
          "default",
          "five",
          "four"
        ],
        9
      ]
      ",
      }
    `);
  });

  test("file with __cjsExports - returns __cjsExports", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          const res = require("./fixtures/with-cjs-export");

          console.log(JSON.stringify([
            res instanceof Module,
            Object.keys(res),
            res(),
          ], null, 2));
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
        "stdout": "[
        false,
        [
          "four",
          "five"
        ],
        9
      ]
      ",
      }
    `);
  });
});

describe("dynamic import", () => {
  test("file without __cjsExports - returns ns", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          import("./fixtures/without-cjs-export").then((res) => {
            console.log(JSON.stringify([
              res instanceof Module,
              Object.keys(res),
              res.default(),
            ], null, 2));
          });
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
        "stdout": "[
        true,
        [
          "default",
          "five",
          "four"
        ],
        9
      ]
      ",
      }
    `);
  });

  test("file with __cjsExports - returns ns", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          import("./fixtures/with-cjs-export").then((res) => {
            console.log(JSON.stringify([
              res instanceof Module,
              Object.keys(res),
              res.default(),
            ], null, 2));
          });
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
        "stdout": "[
        true,
        [
          "__cjsExports",
          "default",
          "five",
          "four"
        ],
        9
      ]
      ",
      }
    `);
  });
});

describe("std.importModule", () => {
  test("file without __cjsExports - returns ns", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          const std = require("quickjs:std");
          const res = std.importModule("./fixtures/without-cjs-export");

          console.log(JSON.stringify([
            res instanceof Module,
            Object.keys(res),
            res.default(),
          ], null, 2));
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
        "stdout": "[
        true,
        [
          "default",
          "five",
          "four"
        ],
        9
      ]
      ",
      }
    `);
  });

  test("file with __cjsExports - returns ns", async () => {
    const run = spawn(
      binDir("qjs"),
      [
        "-e",
        `
          const std = require("quickjs:std");
          const res = std.importModule("./fixtures/with-cjs-export");

          console.log(JSON.stringify([
            res instanceof Module,
            Object.keys(res),
            res.default(),
          ], null, 2));
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
        "stdout": "[
        true,
        [
          "__cjsExports",
          "default",
          "five",
          "four"
        ],
        9
      ]
      ",
      }
    `);
  });
});
