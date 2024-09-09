import * as fs from "node:fs";
import { RunContext, spawn } from "first-base";
import {
  binDir,
  rootDir,
  fixturesDir,
  testsWorkDir,
  cleanResult,
} from "./_utils";

const ownWorkDir = testsWorkDir.concat("qjsc");

beforeEach(() => {
  fs.rmSync(ownWorkDir(), { recursive: true, force: true });
  fs.mkdirSync(ownWorkDir(), { recursive: true });
});

test("qjsc-compiled program has access to both std and bytecode", async () => {
  const run = spawn(
    binDir("qjsc"),
    [
      "-e",
      "-m",
      "-o",
      ownWorkDir("uses-std-and-bytecode.c"),
      fixturesDir("uses-std-and-bytecode.js"),
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);

  const run2 = spawn("cc", [
    `-I${rootDir("build/include")}`,
    "-o",
    ownWorkDir("uses-std-and-bytecode"),
    ownWorkDir("uses-std-and-bytecode.c"),
    rootDir("build/lib/quickjs-full.a"),
    "-lm",
  ]);
  await run2.completion;
  expect(cleanResult(run2.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);

  const run3 = spawn(ownWorkDir("uses-std-and-bytecode"));
  await run3.completion;
  expect(cleanResult(run3.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "typeof std: object
    typeof Bytecode: object
    ",
    }
  `);
});
