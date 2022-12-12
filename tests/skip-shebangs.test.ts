import fs from "fs";
import path from "path";
import { rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workdir = rootDir("build/tests/skip-shebangs");

beforeEach(() => {
  rm("-rf", workdir);
  mkdir("-p", workdir);
});

async function runFile(target: string) {
  const run = spawn(binDir("qjs"), [target]);
  await run.completion;
  return run.result;
}

test("files with 0, 1, or 2 shebangs all load properly", async () => {
  const noShebang = path.join(workdir, "no-shebang.js");
  fs.writeFileSync(noShebang, `console.log(2 + 2);`);
  expect(await runFile(noShebang)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);

  const oneShebang = path.join(workdir, "one-shebang.js");
  fs.writeFileSync(oneShebang, `#!/usr/bin/env node\nconsole.log(2 + 2);`);
  expect(await runFile(oneShebang)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);

  const twoShebangs = path.join(workdir, "two-shebangs.js");
  fs.writeFileSync(
    twoShebangs,
    `#!/usr/bin/env node\n#!/usr/bin/env node\nconsole.log(2 + 2);`
  );
  expect(await runFile(twoShebangs)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);
});
