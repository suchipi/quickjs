import path from "path";
import { cp, rm, mkdir, echo } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workdir = rootDir("build/tests/qjsbootstrap-argv0");

beforeEach(() => {
  rm("-rf", workdir);
  mkdir("-p", workdir);
});

test("qjsbootstrap - finds itself properly when argv0 is indirect", async () => {
  const run = spawn(binDir("qjsbootstrap"), {
    argv0: "something not particularly helpful",
  });
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "append UTF-8 encoded JavaScript to the end of this binary to change this binary into a program that executes that JavaScript code
    ",
    }
  `);

  const prog = path.join(workdir, "myprog");
  cp(binDir("qjsbootstrap"), prog);
  echo("console.log(2 + 2)").toEnd(prog);

  const run2 = spawn(prog, {
    argv0: "something not particularly helpful",
  });
  await run2.completion;
  expect(run2.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "4
    ",
    }
  `);
});
