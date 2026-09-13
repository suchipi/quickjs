import { test, beforeEach, expect } from "vitest";
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
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "",
    }
  `);

  const bytecodeView = inspect(
    fs.readFileSync(workDir("file-to-bytecode.bin"))
  );
  expect(bytecodeView).toMatchInlineSnapshot(`
    "Buffer [
    	│0x00000000│ 08 1E 26 66 69 6C 65 2D 74 6F 2D 62 79 74 65 63
    	│0x00000010│ 6F 64 65 2E 6A 73 16 71 75 69 63 6B 6A 73 3A 73
    	│0x00000020│ 74 64 20 71 75 69 63 6B 6A 73 3A 62 79 74 65 63
    	│0x00000030│ 6F 64 65 06 73 74 64 10 42 79 74 65 63 6F 64 65
    	│0x00000040│ 08 6D 61 69 6E 14 73 63 72 69 70 74 41 72 67 73
    	│0x00000050│ 14 70 6F 73 69 74 69 6F 6E 61 6C 0A 73 74 72 69
    	│0x00000060│ 70 02 69 06 61 72 67 16 5F 71 75 69 63 6B 6A 73
    	│0x00000070│ 52 75 6E 16 5F 74 68 69 73 53 63 72 69 70 74 12
    	│0x00000080│ 69 6E 70 75 74 46 69 6C 65 14 6F 75 74 70 75 74
    	│0x00000090│ 46 69 6C 65 1E 65 6E 63 6F 64 65 64 46 69 6C 65
    	│0x000000A0│ 4E 61 6D 65 10 62 79 74 65 63 6F 64 65 06 6F 75
    	│0x000000B0│ 74 0E 2D 2D 73 74 72 69 70 08 70 75 73 68 0A 64
    	│0x000000C0│ 65 62 75 67 2E 49 6E 76 61 6C 69 64 20 2D 2D 73
    	│0x000000D0│ 74 72 69 70 20 76 61 6C 75 65 3A 20 12 73 74 72
    	│0x000000E0│ 69 6E 67 69 66 79 3E 20 28 65 78 70 65 63 74 65
    	│0x000000F0│ 64 20 22 73 6F 75 72 63 65 22 20 6F 72 20 22 64
    	│0x00000100│ 65 62 75 67 22 29 B4 01 55 73 61 67 65 3A 20 66
    	│0x00000110│ 69 6C 65 2D 74 6F 2D 62 79 74 65 63 6F 64 65 20
    	│0x00000120│ 5B 2D 2D 73 74 72 69 70 20 3C 73 6F 75 72 63 65
    	│0x00000130│ 7C 64 65 62 75 67 3E 5D 20 3C 69 6E 70 75 74 2E
    	│0x00000140│ 6A 73 3E 20 3C 6F 75 74 70 75 74 2E 62 69 6E 3E
    	│0x00000150│ 20 5B 65 6E 63 6F 64 65 64 46 69 6C 65 4E 61 6D
    	│0x00000160│ 65 5D 10 66 72 6F 6D 46 69 6C 65 08 6F 70 65 6E
    	│0x00000170│ 04 77 62 0A 77 72 69 74 65 14 62 79 74 65 4C 65
    	│0x00000180│ 6E 67 74 68 0D E6 03 02 E8 03 00 EA 03 00 00 00
    	│0x00000190│ 02 00 01 84 02 00 01 01 84 02 01 00 0C 20 06 01
    	│0x000001A0│ A8 01 00 00 00 01 00 06 01 0C 00 EC 03 00 1E 00
    	│0x000001B0│ EE 03 01 1E 00 F0 03 00 46 01 F2 03 00 05 00 CE
    	│0x000001C0│ 02 00 05 00 DC 02 00 05 00 08 EA 05 C0 00 E3 29
    	│0x000001D0│ DF EE 0E 06 2F E6 03 08 00 00 00 07 6A 00 07 08
    	│0x000001E0│ 00 0C 43 06 01 F0 03 00 0B 00 07 00 05 00 D0 02
    	│0x000001F0│ 0B F4 03 00 00 B0 F6 03 01 00 A0 F8 03 0B 00 A0
    	│0x00000200│ FA 03 03 00 B0 FC 03 02 00 A0 FE 03 05 00 A0 80
    	│0x00000210│ 04 06 00 A0 82 04 07 00 A0 84 04 08 00 A0 86 04
    	│0x00000220│ 09 00 B0 88 04 0A 00 B0 F2 03 03 03 00 CE 02 04
    	│0x00000230│ 03 00 DC 02 05 03 00 EE 03 01 1A 00 EC 03 00 1A
    	│0x00000240│ 00 5E 0A 00 5E 09 00 5E 08 00 5E 07 00 5E 06 00
    	│0x00000250│ 5E 05 00 5E 04 00 5E 01 00 5E 00 00 26 00 00 C9
    	│0x00000260│ 09 CA 5E 02 00 B5 CB 5F 02 00 38 00 00 E9 A1 EA
    	│0x00000270│ 40 5E 03 00 38 00 00 5F 02 00 43 CC 5F 03 00 04
    	│0x00000280│ 05 01 00 00 A9 EA 11 38 00 00 5F 02 00 8D 61 02
    	│0x00000290│ 00 43 60 01 00 EC 10 5F 00 00 3E 06 01 00 00 5F
    	│0x000002A0│ 03 00 24 01 00 0E 5F 02 00 8F 60 02 00 0E EC B8
    	│0x000002B0│ 5F 01 00 09 AA EA 3F 5F 01 00 04 70 00 00 00 AA
    	│0x000002C0│ EA 34 5F 01 00 04 07 01 00 00 AA EA 29 38 01 00
    	│0x000002D0│ 11 04 08 01 00 00 3E 60 00 00 00 38 02 00 3E 09
    	│0x000002E0│ 01 00 00 5F 01 00 24 01 00 04 0A 01 00 00 24 02
    	│0x000002F0│ 00 21 01 00 30 06 11 F2 EB 1E 7B 7E 00 0E C3 04
    	│0x00000300│ 7E 00 0E C3 05 7E 00 0E C3 06 7E 00 0E C3 07 7E
    	│0x00000310│ 00 0E C3 08 82 EC 07 0E 5F 00 00 EC DE 5F 06 00
    	│0x00000320│ 11 EA 05 0E 5F 07 00 94 EA 0E 38 01 00 11 04 0B
    	│0x00000330│ 01 00 00 21 01 00 30 5F 08 00 94 EA 07 5F 06 00
    	│0x00000340│ 60 08 00 64 03 00 3E 0C 01 00 00 5F 06 00 0B 5F
    	│0x00000350│ 08 00 49 02 01 00 00 5F 01 00 49 FB 00 00 00 24
    	│0x00000360│ 02 00 C3 09 64 04 00 3E 0D 01 00 00 5F 07 00 04
    	│0x00000370│ 0E 01 00 00 24 02 00 C3 0A 5F 0A 00 3E 0F 01 00
    	│0x00000380│ 00 5F 09 00 B5 5F 09 00 3D 10 01 00 00 24 03 00
    	│0x00000390│ 29 E6 03 84 01 0C 00 9B 26 0D 0D 1C 02 07 0A 11
    	│0x000003A0│ 08 11 14 07 17 21 07 11 16 11 01 07 17 08 0B 2A
    	│0x000003B0│ 08 12 04 11 1A 11 03 16 01 22 23 11 14 1B 0C 11
    	│0x000003C0│ 01 00 04 09 28 11 02 00 07 12 47 16 0C 11 1A 2A
    	│0x000003D0│ 0C 11 20 2A 0C 12 4D 49 24 11 08 1B 16 11 01 38
    	│0x000003E0│ 35 11 1D 00 24 0C 00 1D 08 25 1A 21 0D 2F 0A 11
    	│0x000003F0│ 1D 00 01 0A 06 21 1E 23 05 11 10 1B 14 66 01 11
    	│0x00000400│ 25 00 02 08 05 11 06 1B 0C 2A 01 11 13 0D 13 11
    	│0x00000410│ 06 1B 0E 16 1A 11 10 1B 2B 8E 08 66 75 6E 63 74
    	│0x00000420│ 69 6F 6E 20 6D 61 69 6E 28 29 20 7B 0A 20 20 2F
    	│0x00000430│ 2F 20 50 75 6C 6C 20 60 2D 2D 73 74 72 69 70 20
    	│0x00000440│ 3C 73 6F 75 72 63 65 7C 64 65 62 75 67 3E 60 20
    	│0x00000450│ 6F 75 74 20 6F 66 20 73 63 72 69 70 74 41 72 67
    	│0x00000460│ 73 3B 20 6C 65 61 76 65 20 65 76 65 72 79 74 68
    	│0x00000470│ 69 6E 67 0A 20 20 2F 2F 20 65 6C 73 65 20 70 6F
    	│0x00000480│ 73 69 74 69 6F 6E 61 6C 2E 0A 20 20 63 6F 6E 73
    	│0x00000490│ 74 20 70 6F 73 69 74 69 6F 6E 61 6C 20 3D 20 5B
    	│0x000004A0│ 5D 3B 0A 20 20 6C 65 74 20 73 74 72 69 70 20 3D
    	│0x000004B0│ 20 66 61 6C 73 65 3B 0A 20 20 66 6F 72 20 28 6C
    	│0x000004C0│ 65 74 20 69 20 3D 20 30 3B 20 69 20 3C 20 73 63
    	│0x000004D0│ 72 69 70 74 41 72 67 73 2E 6C 65 6E 67 74 68 3B
    	│0x000004E0│ 20 69 2B 2B 29 20 7B 0A 20 20 20 20 63 6F 6E 73
    	│0x000004F0│ 74 20 61 72 67 20 3D 20 73 63 72 69 70 74 41 72
    	│0x00000500│ 67 73 5B 69 5D 3B 0A 20 20 20 20 69 66 20 28 61
    	│0x00000510│ 72 67 20 3D 3D 3D 20 22 2D 2D 73 74 72 69 70 22
    	│0x00000520│ 29 20 7B 0A 20 20 20 20 20 20 73 74 72 69 70 20
    	│0x00000530│ 3D 20 73 63 72 69 70 74 41 72 67 73 5B 2B 2B 69
    	│0x00000540│ 5D 3B 0A 20 20 20 20 7D 20 65 6C 73 65 20 7B 0A
    	│0x00000550│ 20 20 20 20 20 20 70 6F 73 69 74 69 6F 6E 61 6C
    	│0x00000560│ 2E 70 75 73 68 28 61 72 67 29 3B 0A 20 20 20 20
    	│0x00000570│ 7D 0A 20 20 7D 0A 0A 20 20 69 66 20 28 73 74 72
    	│0x00000580│ 69 70 20 21 3D 3D 20 66 61 6C 73 65 20 26 26 20
    	│0x00000590│ 73 74 72 69 70 20 21 3D 3D 20 22 73 6F 75 72 63
    	│0x000005A0│ 65 22 20 26 26 20 73 74 72 69 70 20 21 3D 3D 20
    	│0x000005B0│ 22 64 65 62 75 67 22 29 20 7B 0A 20 20 20 20 74
    	│0x000005C0│ 68 72 6F 77 20 6E 65 77 20 45 72 72 6F 72 28 0A
    	│0x000005D0│ 20 20 20 20 20 20 60 49 6E 76 61 6C 69 64 20 2D
    	│0x000005E0│ 2D 73 74 72 69 70 20 76 61 6C 75 65 3A 20 24 7B
    	│0x000005F0│ 4A 53 4F 4E 2E 73 74 72 69 6E 67 69 66 79 28 73
    	│0x00000600│ 74 72 69 70 29 7D 20 28 65 78 70 65 63 74 65 64
    	│0x00000610│ 20 22 73 6F 75 72 63 65 22 20 6F 72 20 22 64 65
    	│0x00000620│ 62 75 67 22 29 60 0A 20 20 20 20 29 3B 0A 20 20
    	│0x00000630│ 7D 0A 0A 20 20 6C 65 74 20 5B 5F 71 75 69 63 6B
    	│0x00000640│ 6A 73 52 75 6E 2C 20 5F 74 68 69 73 53 63 72 69
    	│0x00000650│ 70 74 2C 20 69 6E 70 75 74 46 69 6C 65 2C 20 6F
    	│0x00000660│ 75 74 70 75 74 46 69 6C 65 2C 20 65 6E 63 6F 64
    	│0x00000670│ 65 64 46 69 6C 65 4E 61 6D 65 5D 20 3D 0A 20 20
    	│0x00000680│ 20 20 70 6F 73 69 74 69 6F 6E 61 6C 3B 0A 0A 20
    	│0x00000690│ 20 69 66 20 28 21 28 69 6E 70 75 74 46 69 6C 65
    	│0x000006A0│ 20 26 26 20 6F 75 74 70 75 74 46 69 6C 65 29 29
    	│0x000006B0│ 20 7B 0A 20 20 20 20 74 68 72 6F 77 20 6E 65 77
    	│0x000006C0│ 20 45 72 72 6F 72 28 0A 20 20 20 20 20 20 22 55
    	│0x000006D0│ 73 61 67 65 3A 20 66 69 6C 65 2D 74 6F 2D 62 79
    	│0x000006E0│ 74 65 63 6F 64 65 20 5B 2D 2D 73 74 72 69 70 20
    	│0x000006F0│ 3C 73 6F 75 72 63 65 7C 64 65 62 75 67 3E 5D 20
    	│0x00000700│ 3C 69 6E 70 75 74 2E 6A 73 3E 20 3C 6F 75 74 70
    	│0x00000710│ 75 74 2E 62 69 6E 3E 20 5B 65 6E 63 6F 64 65 64
    	│0x00000720│ 46 69 6C 65 4E 61 6D 65 5D 22 0A 20 20 20 20 29
    	│0x00000730│ 3B 0A 20 20 7D 0A 0A 20 20 69 66 20 28 21 65 6E
    	│0x00000740│ 63 6F 64 65 64 46 69 6C 65 4E 61 6D 65 29 20 7B
    	│0x00000750│ 0A 20 20 20 20 65 6E 63 6F 64 65 64 46 69 6C 65
    	│0x00000760│ 4E 61 6D 65 20 3D 20 69 6E 70 75 74 46 69 6C 65
    	│0x00000770│ 3B 0A 20 20 7D 0A 0A 20 20 63 6F 6E 73 74 20 62
    	│0x00000780│ 79 74 65 63 6F 64 65 20 3D 20 42 79 74 65 63 6F
    	│0x00000790│ 64 65 2E 66 72 6F 6D 46 69 6C 65 28 69 6E 70 75
    	│0x000007A0│ 74 46 69 6C 65 2C 20 7B 0A 20 20 20 20 65 6E 63
    	│0x000007B0│ 6F 64 65 64 46 69 6C 65 4E 61 6D 65 2C 0A 20 20
    	│0x000007C0│ 20 20 73 74 72 69 70 2C 0A 20 20 7D 29 3B 0A 20
    	│0x000007D0│ 20 63 6F 6E 73 74 20 6F 75 74 20 3D 20 73 74 64
    	│0x000007E0│ 2E 6F 70 65 6E 28 6F 75 74 70 75 74 46 69 6C 65
    	│0x000007F0│ 2C 20 22 77 62 22 29 3B 0A 20 20 6F 75 74 2E 77
    	│0x00000800│ 72 69 74 65 28 62 79 74 65 63 6F 64 65 2C 20 30
    	│0x00000810│ 2C 20 62 79 74 65 63 6F 64 65 2E 62 79 74 65 4C
    	│0x00000820│ 65 6E 67 74 68 29 3B 0A 7D
    ]"
  `);
});

// `--strip <source|debug>` flag tests. Use a small fixture
// (tests/fixtures/named-function.js) so the snapshots stay compact.
// Three calls to the script (default, --strip source, --strip debug)
// should produce three different-sized outputs.

test("file-to-bytecode --strip source / debug produce smaller binaries", async () => {
  const fixture = rootDir("tests/fixtures/named-function.js");
  const out = workDir("named-function.bin");

  async function compile(extraArgs: string[]) {
    rm("-f", out);
    const run = spawn(
      binDir("quickjs-run"),
      [binDir("file-to-bytecode.js"), ...extraArgs, fixture, out],
      { cwd: __dirname }
    );
    await run.completion;
    expect(run.cleanResult().code, run.cleanResult().stderr).toBe(0);
    return fs.statSync(out).size;
  }

  const fullSize = await compile([]);
  const stripSourceSize = await compile(["--strip", "source"]);
  const stripDebugSize = await compile(["--strip", "debug"]);

  expect(stripSourceSize).toBeLessThan(fullSize);
  expect(stripDebugSize).toBeLessThan(stripSourceSize);
});

test("file-to-bytecode rejects invalid --strip value", async () => {
  const fixture = rootDir("tests/fixtures/named-function.js");
  const out = workDir("named-function.bin");
  const run = spawn(
    binDir("quickjs-run"),
    [binDir("file-to-bytecode.js"), "--strip", "garbage", fixture, out],
    { cwd: __dirname }
  );
  await run.completion;
  const result = run.cleanResult();
  expect(result.code).not.toBe(0);
  expect(result.stderr).toContain("Invalid --strip value");
});
