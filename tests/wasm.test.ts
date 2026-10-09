import { test as baseTest, expect } from "vitest";
import { spawn } from "first-base";
import { rootDir, shouldRunWasmTests } from "./_utils";
import path from "path";

const test = baseTest.runIf(shouldRunWasmTests);

const wasmBinDir = path.join(
  rootDir(),
  "build",
  "wasm32-unknown-wasip2",
  "bin"
);
const qjsWasm = path.join(wasmBinDir, "qjs.wasm");

test("basic JS execution", async () => {
  const run = spawn(
    "wasmtime",
    ["run", qjsWasm, "-e", "console.log('hello from wasm')"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "string true
    ",
    }
  `);
});

test("relative import resolves a sibling file", async () => {
  const run = spawn(
    "wasmtime",
    ["run", "--dir=.", qjsWasm, "tests/fixtures/subdir/reaches-over.js"],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "5
    ",
    }
  `);
});

test("os.dup", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      "--dir=.",
      qjsWasm,
      "-e",
      `
      import * as os from "quickjs:os";
      import * as enc from "quickjs:encoding";

      const fd = os.open("tests/fixtures/ah.txt", os.O_RDONLY);
      const duplicate = os.dup(fd);
      console.log("new fd:", duplicate !== fd);

      const buffer = new ArrayBuffer(16);
      const bytesRead = os.read(duplicate, buffer, 0, buffer.byteLength);
      console.log("content:", enc.toUtf8(buffer.slice(0, bytesRead)).trim());
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "new fd: true
    content: あ
    ",
    }
  `);
});

test("os.dup2", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      "--dir=.",
      qjsWasm,
      "-e",
      `
      import * as os from "quickjs:os";
      import * as enc from "quickjs:encoding";

      const fd = os.open("tests/fixtures/ah.txt", os.O_RDONLY);
      const target = os.dup(fd);
      os.close(target);
      console.log("returns target:", os.dup2(fd, target) === target);

      const buffer = new ArrayBuffer(16);
      const bytesRead = os.read(target, buffer, 0, buffer.byteLength);
      console.log("content:", enc.toUtf8(buffer.slice(0, bytesRead)).trim());
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "returns target: true
    content: あ
    ",
    }
  `);
});

test("os.gethostname", async () => {
  const run = spawn(
    "wasmtime",
    [
      "run",
      qjsWasm,
      "-e",
      `
      import * as os from "quickjs:os";
      const hostname = os.gethostname();
      console.log("type:", typeof hostname);
      console.log("non-empty:", hostname.length > 0);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: string
    non-empty: true
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: popen is not supported on wasm
    ",
    }
  `);
});
