import { spawn } from "first-base";
import { rootDir } from "./_utils";
import path from "path";

if (process.env.CI) {
  test.only("skipped in CI (we don't compile wasm in CI)", () => {});
}

const wasmBinDir = path.join(rootDir(), "build", "bin");
const qjsWasm = path.join(wasmBinDir, "qjs.wasm");

test("basic JS execution", async () => {
  const run = spawn(
    "wasmtime",
    ["run", qjsWasm, "-e", "console.log('hello from wasm')"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello from wasm
    ",
    }
  `);
});

test("arithmetic and typeof", async () => {
  const run = spawn(
    "wasmtime",
    ["run", qjsWasm, "-e", "console.log(typeof 42, 2 + 2, typeof 'hello')"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "number 4 string
    ",
    }
  `);
});

test("os.platform returns wasm", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      qjsWasm,
      "-e",
      `import { platform } from "quickjs:os"; console.log(platform);`,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "wasm
    ",
    }
  `);
});

test("file I/O via quickjs:std", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      "--dir=.",
      qjsWasm,
      "-e",
      `import * as std from "quickjs:std"; const s = std.loadFile("package.json"); console.log(typeof s, s.length > 0);`,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "string true
    ",
    }
  `);
});

test("unsupported functions throw errors", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      qjsWasm,
      "-e",
      `
      import * as os from "quickjs:os";
      try {
        os.exec(["ls"]);
        console.log("ERROR: should have thrown");
      } catch (e) {
        console.log("caught:", e.message);
      }
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught: exec is not supported on wasm
    ",
    }
  `);
});

test("popen throws on wasm", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      qjsWasm,
      "-e",
      `
      import * as std from "quickjs:std";
      try {
        std.popen("ls", "r");
        console.log("ERROR: should have thrown");
      } catch (e) {
        console.log("caught:", e.message);
      }
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught: popen is not supported on wasm
    ",
    }
  `);
});
