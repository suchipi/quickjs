// Tests for the non-standard binary ArrayBuffer literal syntax:
//   SOH(0x01) <decimal byte-length N> STX(0x02) <N raw bytes> ETX(0x03)
// which evaluates to a fresh ArrayBuffer. The payload is consumed by count,
// so it may contain any byte (NUL included). Because the source contains raw
// control/NUL bytes, fixtures are written as binary files and run as files;
// they cannot be passed inline via `-e` (argv is a NUL-terminated C string).

import { test, beforeEach, expect } from "vitest";
import fs from "fs";
import { pathMarker } from "path-less-traveled";
import { rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workDir = pathMarker(rootDir("build/tests/array-buffer-literal"));

const SOH = 0x01;
const STX = 0x02;
const ETX = 0x03;

beforeEach(() => {
  rm("-rf", workDir());
  mkdir("-p", workDir());
});

function literalBytes(
  declaredLength: string,
  payload: number[],
  framing: { stx?: boolean; etx?: boolean } = {}
): Buffer {
  const parts: Buffer[] = [
    Buffer.from([SOH]),
    Buffer.from(declaredLength, "ascii"),
  ];
  if (framing.stx !== false) {
    parts.push(Buffer.from([STX]));
  }
  parts.push(Buffer.from(payload));
  if (framing.etx !== false) {
    parts.push(Buffer.from([ETX]));
  }
  return Buffer.concat(parts);
}

function writeScript(
  fileName: string,
  prefix: string,
  literal: Buffer,
  suffix: string
): string {
  const fixturePath = workDir(fileName);
  fs.writeFileSync(
    fixturePath,
    Buffer.concat([Buffer.from(prefix, "utf8"), literal, Buffer.from(suffix, "utf8")])
  );
  return fixturePath;
}

function runFile(fixturePath: string) {
  return spawn(binDir("qjs"), [fixturePath], { cwd: rootDir() });
}

const REPORT =
  ';\nconsole.log("byteLength", arrayBuffer.byteLength);\n' +
  'console.log("bytes", Array.from(new Uint8Array(arrayBuffer)).join(" "));\n' +
  'console.log("isArrayBuffer", arrayBuffer instanceof ArrayBuffer);\n';

test("basic 16-byte literal (interior NUL and a payload byte equal to ETX)", async () => {
  // Includes an interior 0x00 and a payload byte equal to 0x03 (ETX) to prove
  // consumption is purely length-based and ignores those bytes' meaning.
  const payload = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03,
    0x04, 0x05, 0x06, 0x07,
  ];
  const fixturePath = writeScript(
    "basic.js",
    "const arrayBuffer = ",
    literalBytes("16", payload),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "byteLength 16
    bytes 137 80 78 71 13 10 26 10 0 1 2 3 4 5 6 7
    isArrayBuffer true
    ",
    }
  `);
});

test("payload containing NUL bytes round-trips intact", async () => {
  const payload = [0x00, 0xff, 0x00, 0x01, 0x00];
  const fixturePath = writeScript(
    "nul-payload.js",
    "const arrayBuffer = ",
    literalBytes("5", payload),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "byteLength 5
    bytes 0 255 0 1 0
    isArrayBuffer true
    ",
    }
  `);
});

test("zero-length literal yields an empty ArrayBuffer", async () => {
  const fixturePath = writeScript(
    "empty.js",
    "const arrayBuffer = ",
    literalBytes("0", []),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "byteLength 0
    bytes 
    isArrayBuffer true
    ",
    }
  `);
});

test("each evaluation produces a fresh, independent ArrayBuffer", async () => {
  const fixturePath = writeScript(
    "fresh.js",
    "function make() { return ",
    literalBytes("4", [0, 0, 0, 0]),
    ";\n}\n" +
      "const first = make();\n" +
      "const second = make();\n" +
      "new Uint8Array(first)[0] = 42;\n" +
      'console.log("first[0]", new Uint8Array(first)[0]);\n' +
      'console.log("second[0]", new Uint8Array(second)[0]);\n' +
      'console.log("same", first === second);\n'
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "first[0] 42
    second[0] 0
    same false
    ",
    }
  `);
});

test("survives qjsc bytecode serialization round-trip", async () => {
  // Compile a file containing the literal to bytecode, deserialize, and run it.
  // Exercises BC_TAG_ARRAY_BUFFER serialization of the cpool constant plus the
  // new OP_push_array_buffer opcode surviving the bytecode stream. Interior NUL
  // included to confirm bytes survive serialization too.
  const fixturePath = writeScript(
    "roundtrip.js",
    "const arrayBuffer = ",
    literalBytes("5", [0x00, 0x01, 0x02, 0x00, 0x03]),
    ';\nconsole.log("rt", arrayBuffer.byteLength, Array.from(new Uint8Array(arrayBuffer)).join(" "));\n'
  );
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const bytecode = require("quickjs:bytecode");
        const compiled = bytecode.fromFile(${JSON.stringify(fixturePath)});
        bytecode.toValue(compiled)();
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
      "stdout": "rt 5 0 1 2 0 3
    ",
    }
  `);
});

test("module detection skips a leading literal and still sees export", async () => {
  // A .js file (module/script auto-detected) that begins with a binary literal
  // containing a NUL, then an export. simple_next_token must skip the literal
  // by length to reach `export` and classify this as a module; otherwise the
  // export is a script-mode syntax error.
  const fixturePath = writeScript(
    "module-detect.js",
    "",
    literalBytes("3", [0x00, 0xaa, 0x00]),
    "\nexport const detected = 1;\nconsole.log(\"module detected\", detected);\n"
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "module detected 1
    ",
    }
  `);
});

test("error: declared length larger than remaining input", async () => {
  const fixturePath = writeScript(
    "err-eof.js",
    "const arrayBuffer = ",
    literalBytes("100", [1, 2, 3], { etx: false }),
    ""
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "SyntaxError: unexpected end of input in binary ArrayBuffer literal
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("error: payload does not end at the ETX terminator", async () => {
  const fixturePath = writeScript(
    "err-terminator.js",
    "const arrayBuffer = ",
    literalBytes("2", [9, 9, 9, 9]),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "SyntaxError: binary ArrayBuffer literal payload does not end at \\x03 terminator
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("error: missing STX after the byte-length", async () => {
  const fixturePath = writeScript(
    "err-no-stx.js",
    "const arrayBuffer = ",
    literalBytes("2", [0x41, 0x42], { stx: false }),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "SyntaxError: expected \\x02 after byte-length in binary ArrayBuffer literal
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("error: no byte-length digit after SOH", async () => {
  const fixturePath = writeScript(
    "err-no-digit.js",
    "const arrayBuffer = ",
    literalBytes("", [0x41]),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "SyntaxError: expected byte-length digit after \\x01 in binary ArrayBuffer literal
        at somewhere

    ",
      "stdout": "",
    }
  `);
});

test("error: byte-length exceeds maximum", async () => {
  const fixturePath = writeScript(
    "err-too-large.js",
    "const arrayBuffer = ",
    literalBytes("9999999999", [0x41]),
    REPORT
  );
  const run = runFile(fixturePath);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "SyntaxError: binary ArrayBuffer literal length exceeds maximum
        at somewhere

    ",
      "stdout": "",
    }
  `);
});
