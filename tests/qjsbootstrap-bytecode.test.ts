import { test, beforeEach, expect } from "vitest";
import fs from "fs";
import path from "path";
import { cp, rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workdir = rootDir("build/tests/qjsbootstrap-bytecode");

beforeEach(() => {
  rm("-rf", workdir);
  mkdir("-p", workdir);
});

test("qjsbootstrap-bytecode - can execute bytecode", async () => {
  const bytecodePath = path.join(workdir, "log-four.bin");

  // Compile the fixture to bytecode at runtime instead of hardcoding a blob, so
  // this test never needs updating when the bytecode format or version changes.
  const compile = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const std = require("quickjs:std");
        const bytecode = require("quickjs:bytecode");
        const compiled = bytecode.fromFile("tests/fixtures/log-four.js");
        const outFile = std.open(${JSON.stringify(bytecodePath)}, "wb");
        outFile.write(compiled, 0, compiled.byteLength);
        outFile.close();
      `,
    ],
    { cwd: rootDir() }
  );
  await compile.completion;
  expect(compile.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);

  const prog = path.join(workdir, "myprog");
  cp(binDir("qjsbootstrap-bytecode"), prog);
  fs.appendFileSync(prog, fs.readFileSync(bytecodePath));

  const run2 = spawn(prog, { argv0: "myprog" });
  await run2.completion;
  expect(run2.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);
});
