import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

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
