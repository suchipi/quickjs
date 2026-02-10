import { spawn } from "first-base";
import { binDir } from "./_utils";

test("encoding-fuzzer", async () => {
  const run = spawn(binDir("encoding-fuzzer"), []);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Encoding Library Fuzzer Tests
    ==============================

    === Testing Windows-1252 ===

    === Testing Windows-1251 ===

    === Testing Shift_JIS ===
      Shift_JIS: 9604 valid decode pairs found

    === Testing Big5 ===
      Big5: 18590 valid decode pairs found

    === Testing EUC-KR ===
      EUC-KR: 17048 valid decode pairs found

    === Testing EUC-JP ===
      EUC-JP JIS0208: 7336 valid decode pairs found
      EUC-JP JIS0212: 6067 valid decode pairs found

    === Testing GB18030 ===
      GB18030 2-byte: 23940 valid decode pairs found

    === Testing UTF Conversion ===

    === Testing Random Decode Stress Test ===
      Testing 100000 random byte sequences...

    === Testing Random Encode Stress Test ===
      Testing 100000 random codepoints...

    ==============================
    Tests run: 97982
    Passed: 97982
    Failed: 0
    ",
    }
  `);
});
