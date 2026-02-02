import { spawn } from "first-base";
import { rootDir } from "./_utils";
import path from "path";
import type { RunContext } from "first-base";

const winBinDir = path.join(
  rootDir(),
  "build",
  "x86_64-pc-windows-static",
  "bin"
);
const qjsExe = path.join(winBinDir, "qjs.exe");

function cleanResult(result: RunContext["result"]): RunContext["result"] {
  const cleanedStderr = result.stderr
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

  return {
    ...result,
    stderr: cleanedStderr,
  };
}

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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
        os.CloseHandle(pipe.writeEnd);
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const output = os.ReadFileHandle(pipe.readEnd, 4096);
        console.log("output:", JSON.stringify(output.trim()));
        os.CloseHandle(pipe.readEnd);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
        const { Win32Handle } = require("quickjs:os");
        const pipe = os.CreatePipe({ inheritHandle: false });
        console.log("has readEnd:", pipe.readEnd instanceof Win32Handle);
        console.log("has writeEnd:", pipe.writeEnd instanceof Win32Handle);
        os.CloseHandle(pipe.readEnd);
        os.CloseHandle(pipe.writeEnd);
        console.log("done");
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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

test("ReadFileHandle with binary option", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `
        const os = require("quickjs:os");
        const pipe = os.CreatePipe();
        const proc = os.CreateProcess('cmd.exe /c echo binary test', {
          stdout: pipe.writeEnd,
        });
        os.CloseHandle(pipe.writeEnd);
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const output = os.ReadFileHandle(pipe.readEnd, 4096, { binary: true });
        console.log("is ArrayBuffer:", output instanceof ArrayBuffer);
        console.log("byteLength > 0:", output.byteLength > 0);
        os.CloseHandle(pipe.readEnd);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "is ArrayBuffer: true
    byteLength > 0: true
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
        os.CloseHandle(pipe.writeEnd);
        os.WaitForSingleObject(proc.processHandle, Infinity);
        const output = os.ReadFileHandle(pipe.readEnd, 4096);
        console.log("stderr:", JSON.stringify(output.trim()));
        os.CloseHandle(pipe.readEnd);
        os.CloseHandle(proc.processHandle);
        os.CloseHandle(proc.threadHandle);
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "exit code after terminate: 99
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
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "is WAIT_TIMEOUT: true
    ",
    }
  `);
});
