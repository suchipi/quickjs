import { spawn } from "first-base";
import { binDir, fixturesDir, cleanResult } from "./_utils";

test("quickjs:encoding - basic test", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
			const std = require("quickjs:std");
			const enc = require("quickjs:encoding");

			const file = std.open(${JSON.stringify(fixturesDir("ah.txt"))}, "rb");
			const buffer = new ArrayBuffer(8);
			const result = file.read(buffer, 0, 8);
			console.log(inspect({
				result,
				buffer,
			}));

			const asStr = enc.toUtf8(buffer);
			console.log(inspect({ asStr }));
		`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	result: 4
    	buffer: ArrayBuffer {
    		│0x00000000│ E3 81 82 0A 00 00 00 00
    	}
    }
    {
    	asStr: "あ\\n\\0\\0\\0\\0"
    }
    ",
    }
  `);
});

test("quickjs:encoding - fromUtf8 is inverse of toUtf8", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import * as encoding from "quickjs:encoding";

      const input = "hi あ";
      const fromUtf8 = encoding.fromUtf8(input);
      const toUtf8 = encoding.toUtf8(fromUtf8);
      console.log(
        inspect({
          input,
          fromUtf8,
          toUtf8,
        })
      );
  `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	input: "hi あ"
    	fromUtf8: ArrayBuffer {
    		│0x00000000│ 68 69 20 E3 81 82
    	}
    	toUtf8: "hi あ"
    }
    ",
    }
  `);
});

test("TextEncoder - basic encode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder();
      console.log("encoding:", enc.encoding);
      const bytes = enc.encode("hello");
      console.log("instanceof:", bytes instanceof Uint8Array);
      console.log("bytes:", Array.from(bytes).join(","));
      console.log("empty:", Array.from(enc.encode()).join(","));
      console.log("empty2:", Array.from(enc.encode(undefined)).join(","));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-8
    instanceof: true
    bytes: 104,101,108,108,111
    empty: 
    empty2: 
    ",
    }
  `);
});

test("TextEncoder - multibyte characters", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder();
      // あ = E3 81 82, 😀 = F0 9F 98 80
      const bytes = enc.encode("あ😀");
      console.log(Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "e3 81 82 f0 9f 98 80
    ",
    }
  `);
});

test("TextEncoder.encodeInto", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder();

      // Full fit
      const dest1 = new Uint8Array(10);
      const res1 = enc.encodeInto("hello", dest1);
      console.log("full:", JSON.stringify(res1));

      // Partial fit - 3 bytes available, "あ" is 3 bytes
      const dest2 = new Uint8Array(3);
      const res2 = enc.encodeInto("あx", dest2);
      console.log("partial:", JSON.stringify(res2));

      // Too small for multibyte - 2 bytes available, "あ" needs 3
      const dest3 = new Uint8Array(2);
      const res3 = enc.encodeInto("あ", dest3);
      console.log("too small:", JSON.stringify(res3));

      // Supplementary codepoint counts as 2 UTF-16 code units
      const dest4 = new Uint8Array(10);
      const res4 = enc.encodeInto("😀x", dest4);
      console.log("emoji:", JSON.stringify(res4));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "full: {"read":5,"written":5}
    partial: {"read":1,"written":3}
    too small: {"read":0,"written":0}
    emoji: {"read":3,"written":5}
    ",
    }
  `);
});

test("TextDecoder - UTF-8 basic", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder();
      console.log("encoding:", dec.encoding);
      console.log("fatal:", dec.fatal);
      console.log("ignoreBOM:", dec.ignoreBOM);

      // Decode ASCII
      console.log(dec.decode(new Uint8Array([104, 105])));

      // Decode multibyte (あ = E3 81 82)
      console.log(dec.decode(new Uint8Array([0xE3, 0x81, 0x82])));

      // Decode empty
      console.log(JSON.stringify(dec.decode()));
      console.log(JSON.stringify(dec.decode(new Uint8Array([]))));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-8
    fatal: false
    ignoreBOM: false
    hi
    あ
    ""
    ""
    ",
    }
  `);
});

test("TextDecoder - UTF-8 fatal mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("utf-8", { fatal: true });
      console.log("fatal:", dec.fatal);
      try {
        dec.decode(new Uint8Array([0xFF]));
        console.log("ERROR: should have thrown");
      } catch(e) {
        console.log("caught:", e.constructor.name);
      }
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "fatal: true
    caught: TypeError
    ",
    }
  `);
});

test("TextDecoder - UTF-8 replacement mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder();

      // 0xFF is invalid, followed by valid "A"
      const result = dec.decode(new Uint8Array([0xFF, 0x41]));
      console.log("len:", result.length);
      console.log("cp0:", result.codePointAt(0).toString(16));
      console.log("cp1:", result.codePointAt(1).toString(16));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "len: 2
    cp0: fffd
    cp1: 41
    ",
    }
  `);
});

test("TextDecoder - UTF-8 BOM handling", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");

      // BOM stripped by default
      const dec1 = new TextDecoder();
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF, 0x41]);
      console.log("stripped:", dec1.decode(bom));

      // BOM preserved with ignoreBOM
      const dec2 = new TextDecoder("utf-8", { ignoreBOM: true });
      const result = dec2.decode(bom);
      console.log("preserved len:", result.length);
      console.log("preserved cp0:", result.codePointAt(0).toString(16));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "stripped: A
    preserved len: 2
    preserved cp0: feff
    ",
    }
  `);
});

test("TextDecoder - UTF-8 streaming", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder();

      // あ = E3 81 82 — split across two chunks
      const part1 = dec.decode(new Uint8Array([0xE3, 0x81]), { stream: true });
      const part2 = dec.decode(new Uint8Array([0x82]));
      console.log("result:", part1 + part2);

      // Incomplete sequence at end without streaming = replacement
      const dec2 = new TextDecoder();
      const result = dec2.decode(new Uint8Array([0xE3, 0x81]));
      console.log("incomplete cps:", Array.from(result).map(c => c.codePointAt(0).toString(16)).join(","));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "result: あ
    incomplete cps: fffd,fffd
    ",
    }
  `);
});

test("TextDecoder - UTF-16LE", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("utf-16le");
      console.log("encoding:", dec.encoding);

      // "hi" in UTF-16LE
      console.log(dec.decode(new Uint8Array([0x68, 0x00, 0x69, 0x00])));

      // Surrogate pair: U+1F600 = D83D DE00
      const dec2 = new TextDecoder("utf-16le");
      console.log(dec2.decode(new Uint8Array([0x3D, 0xD8, 0x00, 0xDE])));

      // BOM stripped
      const dec3 = new TextDecoder("utf-16le");
      console.log(dec3.decode(new Uint8Array([0xFF, 0xFE, 0x41, 0x00])));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-16le
    hi
    😀
    A
    ",
    }
  `);
});

test("TextDecoder - UTF-16BE", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("utf-16be");
      console.log("encoding:", dec.encoding);

      // "hi" in UTF-16BE
      console.log(dec.decode(new Uint8Array([0x00, 0x68, 0x00, 0x69])));

      // BOM stripped
      const dec2 = new TextDecoder("utf-16be");
      console.log(dec2.decode(new Uint8Array([0xFE, 0xFF, 0x00, 0x41])));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-16be
    hi
    A
    ",
    }
  `);
});

test("TextDecoder - invalid label throws RangeError", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      try {
        new TextDecoder("latin-1");
        console.log("ERROR: should have thrown");
      } catch(e) {
        console.log(e.constructor.name);
      }
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "RangeError
    ",
    }
  `);
});

test("TextDecoder - label aliases", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      console.log(new TextDecoder("utf8").encoding);
      console.log(new TextDecoder("UTF-8").encoding);
      console.log(new TextDecoder("  utf-8  ").encoding);
      console.log(new TextDecoder("unicode-1-1-utf-8").encoding);
      console.log(new TextDecoder("utf-16").encoding);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "utf-8
    utf-8
    utf-8
    utf-8
    utf-16le
    ",
    }
  `);
});
