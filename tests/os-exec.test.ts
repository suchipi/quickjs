import { spawn } from "first-base";
import { binDir } from "./_utils";

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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello async
    got pid: true
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello from stdin
    exit code: 0
    ",
    }
  `);
});
