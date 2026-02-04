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

test("TextDecoder - Shift_JIS basic", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis");
      console.log("encoding:", dec.encoding);

      // ASCII pass-through
      console.log(dec.decode(new Uint8Array([0x48, 0x69])));

      // "日本" in Shift_JIS: 0x93 0xFA 0x96 0x7B
      console.log(dec.decode(new Uint8Array([0x93, 0xFA, 0x96, 0x7B])));

      // 0x80 maps to U+0080
      const r80 = dec.decode(new Uint8Array([0x80]));
      console.log("0x80 cp:", r80.codePointAt(0));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: shift_jis
    Hi
    日本
    0x80 cp: 128
    ",
    }
  `);
});

test("TextDecoder - Shift_JIS half-width katakana", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis");

      // Half-width katakana: 0xA1-0xDF → U+FF61-U+FF9F
      // ｱ = 0xB1, ﾝ = 0xDD
      const result = dec.decode(new Uint8Array([0xB1, 0xDD]));
      console.log(result);
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
      "stdout": "ｱﾝ
    cp0: ff71
    cp1: ff9d
    ",
    }
  `);
});

test("TextDecoder - Shift_JIS label aliases", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      console.log(new TextDecoder("shift_jis").encoding);
      console.log(new TextDecoder("shift-jis").encoding);
      console.log(new TextDecoder("sjis").encoding);
      console.log(new TextDecoder("csshiftjis").encoding);
      console.log(new TextDecoder("ms932").encoding);
      console.log(new TextDecoder("ms_kanji").encoding);
      console.log(new TextDecoder("windows-31j").encoding);
      console.log(new TextDecoder("x-sjis").encoding);
      console.log(new TextDecoder("  Shift_JIS  ").encoding);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "shift_jis
    shift_jis
    shift_jis
    shift_jis
    shift_jis
    shift_jis
    shift_jis
    shift_jis
    shift_jis
    ",
    }
  `);
});

test("TextDecoder - Shift_JIS fatal mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis", { fatal: true });

      // 0xA0 is invalid in Shift_JIS
      try {
        dec.decode(new Uint8Array([0xA0]));
        console.log("ERROR: should have thrown");
      } catch(e) {
        console.log("caught:", e.constructor.name);
      }

      // Incomplete double-byte at end
      try {
        dec.decode(new Uint8Array([0x93]));
        console.log("ERROR: should have thrown");
      } catch(e) {
        console.log("incomplete caught:", e.constructor.name);
      }
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught: TypeError
    incomplete caught: TypeError
    ",
    }
  `);
});

test("TextDecoder - Shift_JIS replacement mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis");

      // 0xA0 is invalid → U+FFFD, then valid ASCII "A"
      const result = dec.decode(new Uint8Array([0xA0, 0x41]));
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

test("TextDecoder - Shift_JIS streaming", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis");

      // "日" in Shift_JIS = 0x93 0xFA — split across two chunks
      const part1 = dec.decode(new Uint8Array([0x93]), { stream: true });
      const part2 = dec.decode(new Uint8Array([0xFA]));
      console.log("result:", part1 + part2);

      // Incomplete at end without streaming → replacement
      const dec2 = new TextDecoder("shift_jis");
      const result = dec2.decode(new Uint8Array([0x93]));
      console.log("incomplete cp:", Array.from(result).map(c => c.codePointAt(0).toString(16)).join(","));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "result: 日
    incomplete cp: fffd
    ",
    }
  `);
});

test("TextDecoder - Shift_JIS trail byte error recovery", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextDecoder } = require("quickjs:encoding");
      const dec = new TextDecoder("shift_jis");

      // Lead byte 0x85 + invalid ASCII trail byte 0x41 ("A")
      // The lead+trail fails lookup, but since trail is ASCII, it should
      // NOT be consumed — we get U+FFFD then "A"
      const result = dec.decode(new Uint8Array([0x85, 0x41]));
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

test("TextEncoder - UTF-16LE basic", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("utf-16le");
      console.log("encoding:", enc.encoding);

      // "hi" in UTF-16LE: 68 00 69 00
      const bytes = enc.encode("hi");
      console.log("bytes:", Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Emoji U+1F600 → surrogate pair D83D DE00 → little-endian: 3D D8 00 DE
      const emoji = enc.encode("😀");
      console.log("emoji:", Array.from(emoji).map(b => b.toString(16).padStart(2, "0")).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-16le
    bytes: 68 00 69 00
    emoji: 3d d8 00 de
    ",
    }
  `);
});

test("TextEncoder - UTF-16BE basic", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("utf-16be");
      console.log("encoding:", enc.encoding);

      // "hi" in UTF-16BE: 00 68 00 69
      const bytes = enc.encode("hi");
      console.log("bytes:", Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Emoji U+1F600 → surrogate pair D83D DE00 → big-endian: D8 3D DE 00
      const emoji = enc.encode("😀");
      console.log("emoji:", Array.from(emoji).map(b => b.toString(16).padStart(2, "0")).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: utf-16be
    bytes: 00 68 00 69
    emoji: d8 3d de 00
    ",
    }
  `);
});

test("TextEncoder - Shift_JIS basic", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("shift_jis");
      console.log("encoding:", enc.encoding);

      // ASCII pass-through
      const ascii = enc.encode("Hi");
      console.log("ascii:", Array.from(ascii).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // "日本" encodes to 0x93 0xFA 0x96 0x7B
      const nihon = enc.encode("日本");
      console.log("nihon:", Array.from(nihon).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Half-width katakana: ｱ (U+FF71) → 0xB1, ﾝ (U+FF9D) → 0xDD
      const katakana = enc.encode("ｱﾝ");
      console.log("katakana:", Array.from(katakana).map(b => b.toString(16).padStart(2, "0")).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "encoding: shift_jis
    ascii: 48 69
    nihon: 93 fa 96 7b
    katakana: b1 dd
    ",
    }
  `);
});

test("TextEncoder - Shift_JIS special mappings", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("shift_jis");

      // U+00A5 (YEN SIGN) → 0x5C per WHATWG
      const yen = enc.encode("\\u00A5");
      console.log("yen:", Array.from(yen).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // U+203E (OVERLINE) → 0x7E per WHATWG
      const overline = enc.encode("\\u203E");
      console.log("overline:", Array.from(overline).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Unencodable character → '?'
      const emoji = enc.encode("😀");
      console.log("unencodable:", Array.from(emoji).map(b => b.toString(16).padStart(2, "0")).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "yen: 5c
    overline: 7e
    unencodable: 3f
    ",
    }
  `);
});

test("TextEncoder - label aliases", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      console.log(new TextEncoder().encoding);
      console.log(new TextEncoder("utf-8").encoding);
      console.log(new TextEncoder("utf-16le").encoding);
      console.log(new TextEncoder("utf-16be").encoding);
      console.log(new TextEncoder("sjis").encoding);
      console.log(new TextEncoder("ms932").encoding);
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
    utf-16le
    utf-16be
    shift_jis
    shift_jis
    ",
    }
  `);
});

test("TextEncoder.encodeInto - UTF-16LE", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("utf-16le");

      // Full fit: "AB" → 4 bytes
      const dest1 = new Uint8Array(10);
      const res1 = enc.encodeInto("AB", dest1);
      console.log("full:", JSON.stringify(res1));
      console.log("bytes:", Array.from(dest1.slice(0, res1.written)).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Partial fit: only room for 2 bytes (1 char), "AB" has 2 chars
      const dest2 = new Uint8Array(2);
      const res2 = enc.encodeInto("AB", dest2);
      console.log("partial:", JSON.stringify(res2));

      // Emoji needs 4 bytes, only 2 available
      const dest3 = new Uint8Array(2);
      const res3 = enc.encodeInto("😀", dest3);
      console.log("no room for emoji:", JSON.stringify(res3));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "full: {"read":2,"written":4}
    bytes: 41 00 42 00
    partial: {"read":1,"written":2}
    no room for emoji: {"read":0,"written":0}
    ",
    }
  `);
});

test("TextEncoder.encodeInto - Shift_JIS", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      const enc = new TextEncoder("shift_jis");

      // Full fit
      const dest1 = new Uint8Array(10);
      const res1 = enc.encodeInto("日本", dest1);
      console.log("full:", JSON.stringify(res1));
      console.log("bytes:", Array.from(dest1.slice(0, res1.written)).map(b => b.toString(16).padStart(2, "0")).join(" "));

      // Partial fit: 2 bytes available, "日" needs 2 bytes
      const dest2 = new Uint8Array(2);
      const res2 = enc.encodeInto("日本", dest2);
      console.log("partial:", JSON.stringify(res2));

      // Too small: 1 byte available, "日" needs 2
      const dest3 = new Uint8Array(1);
      const res3 = enc.encodeInto("日", dest3);
      console.log("too small:", JSON.stringify(res3));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "full: {"read":2,"written":4}
    bytes: 93 fa 96 7b
    partial: {"read":1,"written":2}
    too small: {"read":0,"written":0}
    ",
    }
  `);
});

test("TextEncoder - invalid label throws RangeError", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const { TextEncoder } = require("quickjs:encoding");
      try {
        new TextEncoder("latin-1");
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
