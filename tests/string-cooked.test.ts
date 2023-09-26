import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("String.cooked", async () => {
  const run = spawn(binDir("qjs"), ["tests/fixtures/string-cooked.js"], {
    cwd: rootDir(),
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	raw: "C:\\\\Program Files (x86)\\\\Steam\\\\steamapps\\\\common"
    	cooked: "C:Program Files (x86)Steamsteamappscommon"
    	upperCased: "HELLO \\tHERE YEAH!! YAY [OBJECT OBJECT] WOO"
    }
    ",
    }
  `);
});
