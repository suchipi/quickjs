import { pathMarker } from "path-less-traveled";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const moduleDetectionFixturesDir = pathMarker(
  rootDir("tests/fixtures/module-detection")
);

async function runFile(target: string) {
  const run = spawn(binDir("quickjs-run"), [
    moduleDetectionFixturesDir(target),
  ]);
  await run.completion;
  return run.result;
}

test("module detection works as intended", async () => {
  expect(await runFile("explicit-module.mjs")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "isScript: false
    ",
    }
  `);

  expect(await runFile("implicit-module-with-shebang.js"))
    .toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "isScript: false
    ",
    }
  `);

  expect(await runFile("implicit-module-with-two-shebangs.js"))
    .toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "isScript: false
    ",
    }
  `);

  expect(await runFile("implicit-module.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "isScript: false
    ",
    }
  `);

  expect(await runFile("implicit-script.js")).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "isScript: true
    ",
    }
  `);
});
