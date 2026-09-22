import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

test("os.exec - run a command with block: true", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";

      const ret = exec(["echo", "hello from exec"], { block: true, usePath: true });
      print("exit status:", ret);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello from exec
    exit status: 0
    ",
    }
  `);
});

test("os.exec - run a command with block: false and waitpid", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, waitpid, WIFEXITED, WEXITSTATUS } from "quickjs:os";

      const pid = exec(["echo", "hello async"], { block: false, usePath: true });
      print("got pid:", typeof pid === "number" && pid > 0);
      const [rpid, status] = waitpid(pid, 0);
      print("exited:", WIFEXITED(status));
      print("exit code:", WEXITSTATUS(status));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "got pid: true
    hello async
    exited: true
    exit code: 0
    ",
    }
  `);
});

test("os.exec - kill a child process with SIGTERM", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, kill, waitpid, SIGTERM, WIFSIGNALED, WTERMSIG } from "quickjs:os";

      const pid = exec(["sleep", "60"], { block: false, usePath: true });
      print("got pid:", typeof pid === "number" && pid > 0);
      kill(pid, SIGTERM);
      const [rpid, status] = waitpid(pid, 0);
      print("signaled:", WIFSIGNALED(status));
      print("signal:", WTERMSIG(status) === SIGTERM);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "got pid: true
    signaled: true
    signal: true
    ",
    }
  `);
});

test("os.exec - file option overrides executable", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";

      // Use 'file' to specify the actual binary, while args[0] is a custom name
      const ret = exec(["my-custom-name", "-c", "echo from file option"], {
        block: true,
        file: "/bin/sh",
      });
      print("exit status:", ret);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "from file option
    exit status: 0
    ",
    }
  `);
});

test("os.exec - cwd option changes working directory", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";

      const ret = exec(["pwd"], { block: true, usePath: true, cwd: "/usr" });
      print("exit status:", ret);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "/usr
    exit status: 0
    ",
    }
  `);
});

test("os.exec - env option sets environment variables", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";

      const ret = exec(["sh", "-c", "echo $MY_VAR"], {
        block: true,
        usePath: true,
        env: { MY_VAR: "hello_from_env" },
      });
      print("exit status:", ret);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello_from_env
    exit status: 0
    ",
    }
  `);
});

test("os.exec - stdout option redirects child stdout to pipe", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, pipe, close, read, waitpid } from "quickjs:os";
      import { toUtf8 } from "quickjs:encoding";

      const [rfd, wfd] = pipe();
      const pid = exec(["echo", "piped output"], {
        block: false,
        usePath: true,
        stdout: wfd,
      });
      close(wfd);
      const buf = new ArrayBuffer(256);
      const n = read(rfd, buf, 0, 256);
      close(rfd);
      const str = toUtf8(buf.slice(0, n));
      print("read from pipe:", str.trim());
      waitpid(pid, 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "read from pipe: piped output
    ",
    }
  `);
});

test("os.exec - stderr option redirects child stderr to pipe", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, pipe, close, read, waitpid } from "quickjs:os";
      import { toUtf8 } from "quickjs:encoding";

      const [rfd, wfd] = pipe();
      const pid = exec(["sh", "-c", "echo error_msg >&2"], {
        block: false,
        usePath: true,
        stderr: wfd,
      });
      close(wfd);
      const buf = new ArrayBuffer(256);
      const n = read(rfd, buf, 0, 256);
      close(rfd);
      const str = toUtf8(buf.slice(0, n));
      print("read from pipe:", str.trim());
      waitpid(pid, 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "read from pipe: error_msg
    ",
    }
  `);
});

test("os.exec - stdin option feeds data to child process", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, pipe, close, write, waitpid, WEXITSTATUS } from "quickjs:os";
      import { fromUtf8 } from "quickjs:encoding";

      const [rfd, wfd] = pipe();
      const encoded = fromUtf8("hello from stdin\\n");
      write(wfd, encoded, 0, encoded.byteLength);
      close(wfd);

      const pid = exec(["cat"], {
        block: false,
        usePath: true,
        stdin: rfd,
      });
      close(rfd);
      const [, status] = waitpid(pid, 0);
      print("exit code:", WEXITSTATUS(status));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello from stdin
    exit code: 0
    ",
    }
  `);
});

const tryExecSource = `
  function tryExec(args, options = {}) {
    try {
      print("returned", exec(args, options));
    } catch (error) {
      print(error.name + ": " + error.message);
      print(Object.fromEntries(Object.entries(error)));
    }
  }
`;

test("os.exec - throws when the program can't be found", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, waitpid } from "quickjs:os";
      ${tryExecSource}
      tryExec(["no-such-program-xyz"]);
      tryExec(["no-such-program-xyz"], { block: false });
      tryExec([${JSON.stringify(
        fixturesDir("no-such-program-xyz")
      )}], { usePath: false });

      // Not WNOHANG: macOS briefly lists a child after a failed posix_spawn
      try {
        waitpid(-1, 0);
        print("a child process was left behind");
      } catch (error) {
        print("waitpid errno:", error.errno);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error: No such file or directory (errno = 2, file = no-such-program-xyz)
    { errno: 2, file: "no-such-program-xyz" }
    Error: No such file or directory (errno = 2, file = no-such-program-xyz)
    { errno: 2, file: "no-such-program-xyz" }
    Error: No such file or directory (errno = 2, file = <rootDir>/tests/fixtures/no-such-program-xyz)
    { errno: 2, file: "<rootDir>/tests/fixtures/no-such-program-xyz" }
    waitpid errno: 10
    ",
    }
  `);
});

test("os.exec - throws when the program isn't executable", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";
      ${tryExecSource}
      tryExec([${JSON.stringify(fixturesDir("ah.txt"))}]);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error: Permission denied (errno = 13, file = <rootDir>/tests/fixtures/ah.txt)
    { errno: 13, file: "<rootDir>/tests/fixtures/ah.txt" }
    ",
    }
  `);
});

test("os.exec - throws when the cwd can't be used", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";
      ${tryExecSource}
      tryExec(["true"], { cwd: ${JSON.stringify(
        fixturesDir("no-such-dir-xyz")
      )} });
      tryExec(["true"], { cwd: ${JSON.stringify(fixturesDir("ah.txt"))} });
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error: No such file or directory (errno = 2, cwd = <rootDir>/tests/fixtures/no-such-dir-xyz)
    { errno: 2, cwd: "<rootDir>/tests/fixtures/no-such-dir-xyz" }
    Error: Not a directory (errno = 20, cwd = <rootDir>/tests/fixtures/ah.txt)
    { errno: 20, cwd: "<rootDir>/tests/fixtures/ah.txt" }
    ",
    }
  `);
});

test("os.exec - throws when a stdio fd isn't open", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";
      ${tryExecSource}
      tryExec(["true"], { stdout: 999 });
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error: Bad file descriptor (errno = 9, stdout = 999)
    { errno: 9, stdout: 999 }
    ",
    }
  `);
});

// On macOS, setting uid switches os.exec from posix_spawn to vfork.
test("os.exec - throws the same errors when uid is set", async () => {
  const ownUid = process.getuid!();
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec, waitpid } from "quickjs:os";
      ${tryExecSource}
      tryExec(["no-such-program-xyz"], { uid: ${ownUid} });
      tryExec(["no-such-program-xyz"], { uid: ${ownUid}, block: false });
      tryExec([${JSON.stringify(fixturesDir("no-such-program-xyz"))}], {
        uid: ${ownUid},
        usePath: false,
      });
      tryExec([${JSON.stringify(fixturesDir("ah.txt"))}], { uid: ${ownUid} });
      tryExec(["true"], {
        uid: ${ownUid},
        cwd: ${JSON.stringify(fixturesDir("no-such-dir-xyz"))},
      });
      tryExec(["true"], {
        uid: ${ownUid},
        cwd: ${JSON.stringify(fixturesDir("ah.txt"))},
      });
      tryExec(["true"], { uid: ${ownUid}, stdout: 999 });

      try {
        waitpid(-1, 0);
        print("a child process was left behind");
      } catch (error) {
        print("waitpid errno:", error.errno);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error: No such file or directory (errno = 2, file = no-such-program-xyz)
    { errno: 2, file: "no-such-program-xyz" }
    Error: No such file or directory (errno = 2, file = no-such-program-xyz)
    { errno: 2, file: "no-such-program-xyz" }
    Error: No such file or directory (errno = 2, file = <rootDir>/tests/fixtures/no-such-program-xyz)
    { errno: 2, file: "<rootDir>/tests/fixtures/no-such-program-xyz" }
    Error: Permission denied (errno = 13, file = <rootDir>/tests/fixtures/ah.txt)
    { errno: 13, file: "<rootDir>/tests/fixtures/ah.txt" }
    Error: No such file or directory (errno = 2, cwd = <rootDir>/tests/fixtures/no-such-dir-xyz)
    { errno: 2, cwd: "<rootDir>/tests/fixtures/no-such-dir-xyz" }
    Error: Not a directory (errno = 20, cwd = <rootDir>/tests/fixtures/ah.txt)
    { errno: 20, cwd: "<rootDir>/tests/fixtures/ah.txt" }
    Error: Bad file descriptor (errno = 9, stdout = 999)
    { errno: 9, stdout: 999 }
    waitpid errno: 10
    ",
    }
  `);
});

test.skipIf(process.getuid!() === 0)(
  "os.exec - throws when the process can't switch to uid",
  async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        import { exec } from "quickjs:os";
        ${tryExecSource}
        tryExec(["true"], { uid: 0 });
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "Error: Operation not permitted (errno = 1, uid = 0)
      { errno: 1, uid: 0 }
      ",
      }
    `);
  }
);

test("os.exec - a program that exits with 127 returns 127", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      import { exec } from "quickjs:os";

      print("returned", exec(["sh", "-c", "exit 127"]));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "returned 127
    ",
    }
  `);
});
