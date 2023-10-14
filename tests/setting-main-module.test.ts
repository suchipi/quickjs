import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const importFixturePath = fixturesDir("setting-main-module/mod1_import.js");
const importModuleFixturePath = fixturesDir(
  "setting-main-module/mod1_importModule.js"
);

test("setting the main module - import syntax", async () => {
  const run = spawn(binDir("quickjs-run"), [importFixturePath], {
    cwd: __dirname,
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hi from mod2 false
    hi from mod3 false
    hi from mod1 false
    ",
    }
  `);
});

test("setting the main module - std.importModule", async () => {
  const run = spawn(binDir("quickjs-run"), [importModuleFixturePath], {
    cwd: __dirname,
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hi from mod1 false
    hi from mod2 false
    hi from mod3 true
    ",
    }
  `);
});
