import fs from "fs";
import inspect from "@suchipi/print";
import { pathMarker } from "path-less-traveled";
import { rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workDir = pathMarker(rootDir("build/tests/file-to-bytecode"));

beforeEach(() => {
  rm("-rf", workDir());
  mkdir("-p", workDir());
});

test("file-to-bytecode.js works", async () => {
  const run = spawn(
    binDir("quickjs-run"),
    [
      binDir("file-to-bytecode.js"),
      binDir("file-to-bytecode.js"),
      workDir("file-to-bytecode.bin"),
      "file-to-bytecode.js",
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);

  const bytecodeView = inspect(
    fs.readFileSync(workDir("file-to-bytecode.bin"))
  );
  expect(bytecodeView).toMatchInlineSnapshot(`
    "Buffer [
    	│0x00000000│ 02 14 26 66 69 6C 65 2D 74 6F 2D 62 79 74 65 63
    	│0x00000010│ 6F 64 65 2E 6A 73 16 71 75 69 63 6B 6A 73 3A 73
    	│0x00000020│ 74 64 20 71 75 69 63 6B 6A 73 3A 62 79 74 65 63
    	│0x00000030│ 6F 64 65 06 73 74 64 10 42 79 74 65 63 6F 64 65
    	│0x00000040│ 08 6D 61 69 6E 16 5F 71 75 69 63 6B 6A 73 52 75
    	│0x00000050│ 6E 16 5F 74 68 69 73 53 63 72 69 70 74 12 69 6E
    	│0x00000060│ 70 75 74 46 69 6C 65 14 6F 75 74 70 75 74 46 69
    	│0x00000070│ 6C 65 1E 65 6E 63 6F 64 65 64 46 69 6C 65 4E 61
    	│0x00000080│ 6D 65 10 62 79 74 65 63 6F 64 65 06 6F 75 74 14
    	│0x00000090│ 73 63 72 69 70 74 41 72 67 73 F6 01 59 6F 75 20
    	│0x000000A0│ 6D 75 73 74 20 70 61 73 73 20 74 77 6F 20 70 6F
    	│0x000000B0│ 73 69 74 69 6F 6E 61 6C 20 61 72 67 75 6D 65 6E
    	│0x000000C0│ 74 73 20 74 6F 20 74 68 69 73 20 73 63 72 69 70
    	│0x000000D0│ 74 3A 20 74 68 65 20 69 6E 70 75 74 20 66 69 6C
    	│0x000000E0│ 65 20 70 61 74 68 20 28 6A 73 29 20 61 6E 64 20
    	│0x000000F0│ 74 68 65 20 6F 75 74 70 75 74 20 66 69 6C 65 20
    	│0x00000100│ 70 61 74 68 20 28 62 79 74 65 63 6F 64 65 20 62
    	│0x00000110│ 69 6E 61 72 79 29 2E 10 66 72 6F 6D 46 69 6C 65
    	│0x00000120│ 08 6F 70 65 6E 04 77 62 0A 77 72 69 74 65 14 62
    	│0x00000130│ 79 74 65 4C 65 6E 67 74 68 0F C6 03 02 C8 03 CA
    	│0x00000140│ 03 00 00 02 00 FC 01 00 01 FC 01 01 0E 00 06 01
    	│0x00000150│ A2 01 00 00 00 01 03 01 0A 00 CC 03 00 0D CE 03
    	│0x00000160│ 01 0D D0 03 00 01 08 EA 05 C0 00 E3 29 DF EE 29
    	│0x00000170│ C6 03 01 04 01 00 07 3E 0E 43 06 01 D0 03 00 07
    	│0x00000180│ 00 05 02 00 AB 01 07 D2 03 01 00 20 D4 03 01 01
    	│0x00000190│ 20 D6 03 01 02 20 D8 03 01 03 20 DA 03 01 04 20
    	│0x000001A0│ DC 03 01 05 30 DE 03 01 06 30 CE 03 01 0C CC 03
    	│0x000001B0│ 00 0C 61 06 00 61 05 00 61 04 00 61 03 00 61 02
    	│0x000001C0│ 00 61 01 00 61 00 00 06 11 F2 EB 1A 7D 80 00 0E
    	│0x000001D0│ C9 80 00 0E CA 80 00 0E CB 80 00 0E CC 80 00 0E
    	│0x000001E0│ C3 04 83 EC 09 0E 38 F0 00 00 00 EC E0 62 02 00
    	│0x000001F0│ 11 EA 05 0E 62 03 00 96 EA 10 38 98 00 00 00 11
    	│0x00000200│ 04 F1 00 00 00 21 01 00 2F 62 04 00 96 EA 09 62
    	│0x00000210│ 02 00 11 63 04 00 0E 65 00 00 42 F2 00 00 00 62
    	│0x00000220│ 02 00 0B 62 04 00 4C ED 00 00 00 24 02 00 C3 05
    	│0x00000230│ 65 01 00 42 F3 00 00 00 62 03 00 04 F4 00 00 00
    	│0x00000240│ 24 02 00 C3 06 62 06 00 42 F5 00 00 00 62 05 00
    	│0x00000250│ B5 62 05 00 41 F6 00 00 00 24 03 00 29 C6 03 0C
    	│0x00000260│ 0C 6C 9E 27 44 3B 12 09 21 2D 80 6C 76
    ]"
  `);
});
