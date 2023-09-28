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
    	│0x00000000│ 02 13 72 2F 55 73 65 72 73 2F 73 75 63 68 69 70
    	│0x00000010│ 69 2F 43 6F 64 65 2F 71 75 69 63 6B 6A 73 2F 62
    	│0x00000020│ 75 69 6C 64 2F 62 69 6E 2F 66 69 6C 65 2D 74 6F
    	│0x00000030│ 2D 62 79 74 65 63 6F 64 65 2E 6A 73 16 71 75 69
    	│0x00000040│ 63 6B 6A 73 3A 73 74 64 20 71 75 69 63 6B 6A 73
    	│0x00000050│ 3A 62 79 74 65 63 6F 64 65 06 73 74 64 10 42 79
    	│0x00000060│ 74 65 63 6F 64 65 08 6D 61 69 6E 16 5F 71 75 69
    	│0x00000070│ 63 6B 6A 73 52 75 6E 16 5F 74 68 69 73 53 63 72
    	│0x00000080│ 69 70 74 12 69 6E 70 75 74 46 69 6C 65 14 6F 75
    	│0x00000090│ 74 70 75 74 46 69 6C 65 10 62 79 74 65 63 6F 64
    	│0x000000A0│ 65 06 6F 75 74 14 73 63 72 69 70 74 41 72 67 73
    	│0x000000B0│ F6 01 59 6F 75 20 6D 75 73 74 20 70 61 73 73 20
    	│0x000000C0│ 74 77 6F 20 70 6F 73 69 74 69 6F 6E 61 6C 20 61
    	│0x000000D0│ 72 67 75 6D 65 6E 74 73 20 74 6F 20 74 68 69 73
    	│0x000000E0│ 20 73 63 72 69 70 74 3A 20 74 68 65 20 69 6E 70
    	│0x000000F0│ 75 74 20 66 69 6C 65 20 70 61 74 68 20 28 6A 73
    	│0x00000100│ 29 20 61 6E 64 20 74 68 65 20 6F 75 74 70 75 74
    	│0x00000110│ 20 66 69 6C 65 20 70 61 74 68 20 28 62 79 74 65
    	│0x00000120│ 63 6F 64 65 20 62 69 6E 61 72 79 29 2E 10 66 72
    	│0x00000130│ 6F 6D 46 69 6C 65 08 6F 70 65 6E 04 77 62 0A 77
    	│0x00000140│ 72 69 74 65 14 62 79 74 65 4C 65 6E 67 74 68 0F
    	│0x00000150│ C6 03 02 C8 03 CA 03 00 00 02 00 FC 01 00 01 FC
    	│0x00000160│ 01 01 0E 00 06 01 A2 01 00 00 00 01 03 01 0A 00
    	│0x00000170│ CC 03 00 0D CE 03 01 0D D0 03 00 01 08 EA 05 C0
    	│0x00000180│ 00 E3 29 DF EE 29 C6 03 01 04 01 00 07 34 0E 43
    	│0x00000190│ 06 01 D0 03 00 06 00 05 02 00 8C 01 06 D2 03 01
    	│0x000001A0│ 00 30 D4 03 01 01 30 D6 03 01 02 30 D8 03 01 03
    	│0x000001B0│ 30 DA 03 01 04 30 DC 03 01 05 30 CE 03 01 0C CC
    	│0x000001C0│ 03 00 0C 61 05 00 61 04 00 61 03 00 61 02 00 61
    	│0x000001D0│ 01 00 61 00 00 06 11 F2 EB 15 7D 80 00 0E C9 80
    	│0x000001E0│ 00 0E CA 80 00 0E CB 80 00 0E CC 83 EC 09 0E 38
    	│0x000001F0│ EF 00 00 00 EC E5 62 02 00 11 EA 05 0E 62 03 00
    	│0x00000200│ 96 EA 10 38 98 00 00 00 11 04 F0 00 00 00 21 01
    	│0x00000210│ 00 2F 65 00 00 42 F1 00 00 00 62 02 00 24 01 00
    	│0x00000220│ C3 04 65 01 00 42 F2 00 00 00 62 03 00 04 F3 00
    	│0x00000230│ 00 00 24 02 00 C3 05 62 05 00 42 F4 00 00 00 62
    	│0x00000240│ 04 00 B5 62 04 00 41 F5 00 00 00 24 03 00 29 C6
    	│0x00000250│ 03 0C 09 5D A9 44 3B 12 09 53 6C 76
    ]"
  `);
});
