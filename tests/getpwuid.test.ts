import { spawn } from "first-base";
import { binDir } from "./_utils";

test("pwuid", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");

      console.log("arity", std.getpwuid.length);
      const pwd = std.getpwuid(std.geteuid());
      console.log(JSON.stringify(Object.keys(pwd)));
      console.log("name", typeof pwd.name);
      console.log("passwd", typeof pwd.passwd);
      console.log("uid", typeof pwd.uid);
      console.log("gid", typeof pwd.gid);
      console.log("gecos", typeof pwd.gecos);
      console.log("dir", typeof pwd.dir);
      console.log("shell", typeof pwd.shell);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "arity 1
    ["name","passwd","uid","gid","gecos","dir","shell"]
    name string
    passwd string
    uid number
    gid number
    gecos string
    dir string
    shell string
    ",
    }
  `);
});
