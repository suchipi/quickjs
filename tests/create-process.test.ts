import { spawn, sanitizers } from "first-base";
import { rootDir } from "./_utils";
import path from "path";
import type { RunContext } from "first-base";

if (process.env.CI) {
  test.only("skipped in CI (win32 wine test)", () => {});
}

const winBinDir = path.join(
  rootDir(),
  "build",
  "x86_64-pc-windows-static",
  "bin"
);
const qjsExe = path.join(winBinDir, "qjs.exe");

function cleanWineNoise(str: string) {
  return str
    .split("\n")
    .filter((line) => {
      // Filter out Wine noise: MoltenVK, fixme, err, [mvk-info], GPU info, etc.
      if (line.match(/^\[mvk-/)) return false;
      if (line.match(/^\t/)) return false;
      if (line.match(/^[0-9a-f]{4}:/)) return false;
      if (line.match(/^$/)) return false;
      return true;
    })
    .join("\n");
}

beforeAll(async () => {
  sanitizers.push(cleanWineNoise);
  // Warm up wineserver so first test doesn't pay cold-start cost
  const run = spawn("wine", [qjsExe, "-e", "2 + 2"], { cwd: rootDir() });
  await run.completion;
});
afterAll(() => {
  sanitizers.pop();
});

test("CreateProcess returns process info object", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const { Win32Handle } = require("quickjs:os");
        const result = os.CreateProcess('cmd.exe /c echo hello from CreateProcess');
        console.log("has pid:", typeof result.pid === "number");
        console.log("has tid:", typeof result.tid === "number");
        console.log("has processHandle:", result.processHandle instanceof Win32Handle);
        console.log("has threadHandle:", result.threadHandle instanceof Win32Handle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "has pid: true
    has tid: true
    has processHandle: true
    has threadHandle: true
    ",
    }
  `);
});

test("CreateProcess with moduleName option", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const result = os.CreateProcess(
          '/c echo moduleName test',
          { moduleName: 'C:\\\\windows\\\\system32\\\\cmd.exe' }
        );
        console.log("pid is number:", typeof result.pid === "number");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "pid is number: true
    ",
    }
  `);
});

test("CreateProcess throws on failure", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        try {
          os.CreateProcess(null, { moduleName: 'C:\\\\nonexistent\\\\program.exe' });
          console.log("ERROR: should have thrown");
        } catch (err) {
          console.log("caught:", err.message);
        }
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught: CreateProcess failed: Path not found. (error code 3)
    ",
    }
  `);
});

test("WaitForSingleObject and GetExitCodeProcess", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const proc = os.CreateProcess('cmd.exe /c exit 42');
        const waitResult = os.WaitForSingleObject(proc.processHandle, Infinity);
        console.log("wait result:", waitResult);
        console.log("is WAIT_OBJECT_0:", waitResult === os.WAIT_OBJECT_0);
        const exitCode = os.GetExitCodeProcess(proc.processHandle);
        console.log("exit code:", exitCode);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "wait result: 0
    is WAIT_OBJECT_0: true
    exit code: 42
    done
    ",
    }
  `);
});

test("CreatePipe and stdout redirection", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pipe = os.CreatePipe();
        const proc = os.CreateProcess('cmd.exe /c echo hello from pipe', {
          stdout: pipe.writeEnd,
        });
        pipe.writeEnd.close();
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const output = pipe.readEnd.readAsString();
        console.log("output:", JSON.stringify(output.trim()));
        pipe.readEnd.close();
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "output: "hello from pipe"
    ",
    }
  `);
});

test("CreatePipe with inheritHandle false", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const std = require("quickjs:std");
        const pipe = os.CreatePipe({ inheritHandle: false });
        console.log("has readEnd:", std.isFILE(pipe.readEnd));
        console.log("has writeEnd:", std.isFILE(pipe.writeEnd));
        pipe.readEnd.close();
        pipe.writeEnd.close();
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "has readEnd: true
    has writeEnd: true
    done
    ",
    }
  `);
});

test("CreatePipe read end binary read", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const { toUtf8 } = require("quickjs:encoding");
        const pipe = os.CreatePipe();
        const proc = os.CreateProcess('cmd.exe /c echo binary test', {
          stdout: pipe.writeEnd,
        });
        pipe.writeEnd.close();
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const buf = new ArrayBuffer(4096);
        const bytesRead = pipe.readEnd.read(buf, 0, 4096);
        console.log("bytesRead > 0:", bytesRead > 0);
        const str = toUtf8(buf.slice(0, bytesRead));
        console.log("content:", JSON.stringify(str.trim()));
        pipe.readEnd.close();
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "bytesRead > 0: true
    content: "binary test"
    ",
    }
  `);
});

test("stderr redirection", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pipe = os.CreatePipe();
        const proc = os.CreateProcess('cmd.exe /c echo stderr output 1>&2', {
          stderr: pipe.writeEnd,
        });
        pipe.writeEnd.close();
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const output = pipe.readEnd.readAsString();
        console.log("stderr:", JSON.stringify(output.trim()));
        pipe.readEnd.close();
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "stderr: "stderr output"
    ",
    }
  `);
});

test("TerminateProcess", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const proc = os.CreateProcess('cmd.exe /c ping -n 100 127.0.0.1');
        os.TerminateProcess(proc.processHandle, 99);
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const exitCode = os.GetExitCodeProcess(proc.processHandle);
        console.log("exit code after terminate:", exitCode);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exit code after terminate: 99
    ",
    }
  `);
});

// --- os.exec tests (Windows implementation using CreateProcess internally) ---

test("os.exec block:true returns exit code 0", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const result = os.exec(["cmd.exe", "/c", "echo hello"]);
        console.log("exit code:", result);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello
    exit code: 0
    ",
    }
  `);
});

test("os.exec block:true returns nonzero exit code", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const result = os.exec(["cmd.exe", "/c", "exit 42"]);
        console.log("exit code:", result);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exit code: 42
    ",
    }
  `);
});

test("os.exec block:false returns pid, waitpid gets status", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pid = os.exec(["cmd.exe", "/c", "exit 7"], { block: false });
        console.log("pid is number:", typeof pid === "number");
        const [ret, status] = os.waitpid(pid);
        console.log("ret === pid:", ret === pid);
        console.log("WIFEXITED:", os.WIFEXITED(status));
        console.log("WEXITSTATUS:", os.WEXITSTATUS(status));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "pid is number: true
    ret === pid: true
    WIFEXITED: true
    WEXITSTATUS: 7
    ",
    }
  `);
});

test("os.exec with stdout redirection", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const fds = os.pipe();
        const result = os.exec(["cmd.exe", "/c", "echo piped output"], {
          stdout: fds[1],
        });
        os.close(fds[1]);
        const buf = new ArrayBuffer(4096);
        const n = os.read(fds[0], buf, 0, 4096);
        os.close(fds[0]);
        const { toUtf8 } = require("quickjs:encoding");
        const str = toUtf8(buf.slice(0, n));
        console.log("output:", JSON.stringify(str.trim()));
        console.log("exit code:", result);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "output: "piped output"
    exit code: 0
    ",
    }
  `);
});

test("os.exec with env option", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const std = require("quickjs:std");
        const baseEnv = std.getenviron();
        const result = os.exec(["cmd.exe", "/c", "echo %MY_TEST_VAR%"], {
          env: Object.assign({}, baseEnv, { MY_TEST_VAR: "hello_from_env" }),
        });
        console.log("exit code:", result);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello_from_env
    exit code: 0
    ",
    }
  `);
});

test("os.waitpid with WNOHANG", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pid = os.exec(["cmd.exe", "/c", "ping -n 100 127.0.0.1"], { block: false });
        const [ret, status] = os.waitpid(pid, os.WNOHANG);
        console.log("ret:", ret);
        console.log("status:", status);
        os.kill(pid, 0);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "ret: 0
    status: 0
    ",
    }
  `);
});

test("os.pipe returns two fds", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const fds = os.pipe();
        console.log("is array:", Array.isArray(fds));
        console.log("length:", fds.length);
        console.log("read fd is number:", typeof fds[0] === "number");
        console.log("write fd is number:", typeof fds[1] === "number");
        os.close(fds[0]);
        os.close(fds[1]);
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "is array: true
    length: 2
    read fd is number: true
    write fd is number: true
    done
    ",
    }
  `);
});

test("os.dup and os.dup2", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const fds = os.pipe();
        const dupFd = os.dup(fds[0]);
        console.log("dup fd is number:", typeof dupFd === "number");
        console.log("dup fd !== original:", dupFd !== fds[0]);
        const newFd = 10;
        os.dup2(fds[1], newFd);
        os.close(fds[0]);
        os.close(fds[1]);
        os.close(dupFd);
        os.close(newFd);
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "dup fd is number: true
    dup fd !== original: true
    done
    ",
    }
  `);
});

test("os.kill terminates a process", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pid = os.exec(["cmd.exe", "/c", "ping -n 100 127.0.0.1"], { block: false });
        os.kill(pid, 9);
        const [ret, status] = os.waitpid(pid);
        console.log("ret === pid:", ret === pid);
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "ret === pid: true
    done
    ",
    }
  `);
});

test("WaitForSingleObject with timeout", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const proc = os.CreateProcess('cmd.exe /c ping -n 100 127.0.0.1');
        const waitResult = os.WaitForSingleObject(proc.processHandle, 0);
        console.log("is WAIT_TIMEOUT:", waitResult === os.WAIT_TIMEOUT);
        os.TerminateProcess(proc.processHandle, 0);
        os.WaitForSingleObject(proc.processHandle, Infinity);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "is WAIT_TIMEOUT: true
    ",
    }
  `);
});
