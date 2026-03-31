import { spawn, sanitizers } from "first-base";
import { binDir, rootDir, testsWorkDir } from "./_utils";
import fs from "fs";

const workDir = testsWorkDir.concat("os-module");

const localSanitizers = [
  (str: string) => str.replace(/\/private\/tmp/g, "/tmp"),
];

beforeAll(() => {
  fs.rmSync(workDir(), { recursive: true, force: true });
  fs.mkdirSync(workDir(), { recursive: true });

  sanitizers.push(...localSanitizers);
});

afterAll(() => {
  fs.rmSync(workDir(), { recursive: true, force: true });

  for (const _sanitizer of localSanitizers) {
    sanitizers.pop();
  }
});

// =========== os.open, os.close, os.read, os.write (fd-based) ===========

test("os.open and os.read - read file by fd", async () => {
  const testFile = workDir("fd-read.txt");
  fs.writeFileSync(testFile, "hello fd");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const enc = require("quickjs:encoding");
      const fd = os.open(${JSON.stringify(testFile)}, os.O_RDONLY);
      console.log("fd type:", typeof fd);
      console.log("fd > 2:", fd > 2);
      const buf = new ArrayBuffer(100);
      const n = os.read(fd, buf, 0, 100);
      console.log("bytes read:", n);
      console.log("content:", enc.toUtf8(buf.slice(0, n)));
      os.close(fd);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fd type: number
    fd > 2: true
    bytes read: 8
    content: hello fd
    ",
    }
  `);
});

test("os.open and os.write - write file by fd", async () => {
  const testFile = workDir("fd-write.txt");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const enc = require("quickjs:encoding");
      const fd = os.open(${JSON.stringify(
        testFile
      )}, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644);
      const data = enc.fromUtf8("written via fd");
      const n = os.write(fd, data, 0, data.byteLength);
      console.log("bytes written:", n);
      os.close(fd);

      // Read back
      const fd2 = os.open(${JSON.stringify(testFile)}, os.O_RDONLY);
      const buf = new ArrayBuffer(100);
      const n2 = os.read(fd2, buf, 0, 100);
      console.log("content:", enc.toUtf8(buf.slice(0, n2)));
      os.close(fd2);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "bytes written: 14
    content: written via fd
    ",
    }
  `);
});

// =========== os.seek ===========

test("os.seek - seek within file by fd", async () => {
  const testFile = workDir("fd-seek.txt");
  fs.writeFileSync(testFile, "abcdefghij");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const std = require("quickjs:std");
      const enc = require("quickjs:encoding");
      const fd = os.open(${JSON.stringify(testFile)}, os.O_RDONLY);

      // Seek to offset 5
      const pos = os.seek(fd, 5, std.SEEK_SET);
      console.log("pos after seek:", pos);

      // Read remaining
      const buf = new ArrayBuffer(10);
      const n = os.read(fd, buf, 0, 10);
      console.log("read:", enc.toUtf8(buf.slice(0, n)));

      os.close(fd);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "pos after seek: 5
    read: fghij
    ",
    }
  `);
});

test("os.seek - bigint offset returns bigint", async () => {
  const testFile = workDir("fd-seek-bigint.txt");
  fs.writeFileSync(testFile, "abcdefghij");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const std = require("quickjs:std");
      const fd = os.open(${JSON.stringify(testFile)}, os.O_RDONLY);
      const pos = os.seek(fd, 3n, std.SEEK_SET);
      console.log("type:", typeof pos);
      console.log("value:", pos.toString());
      os.close(fd);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: bigint
    value: 3
    ",
    }
  `);
});

// =========== O_* constants ===========

test("os.O_* constants exist", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("O_RDONLY:", typeof os.O_RDONLY);
      console.log("O_WRONLY:", typeof os.O_WRONLY);
      console.log("O_RDWR:", typeof os.O_RDWR);
      console.log("O_APPEND:", typeof os.O_APPEND);
      console.log("O_CREAT:", typeof os.O_CREAT);
      console.log("O_EXCL:", typeof os.O_EXCL);
      console.log("O_TRUNC:", typeof os.O_TRUNC);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "O_RDONLY: number
    O_WRONLY: number
    O_RDWR: number
    O_APPEND: number
    O_CREAT: number
    O_EXCL: number
    O_TRUNC: number
    ",
    }
  `);
});

// =========== isatty ===========

test("os.isatty - returns false for pipe", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      // When running via spawn, stdin/stdout/stderr are pipes, not TTYs
      console.log("stdin:", os.isatty(0));
      console.log("stdout:", os.isatty(1));
      console.log("stderr:", os.isatty(2));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "stdin: false
    stdout: false
    stderr: false
    ",
    }
  `);
});

// =========== remove ===========

test("os.remove - removes a file", async () => {
  const testFile = workDir("remove-test.txt");
  fs.writeFileSync(testFile, "delete me");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = ${JSON.stringify(testFile)};
      os.remove(path);
      console.log("removed");
      try {
        os.stat(path);
        console.log("ERROR: file still exists");
      } catch(e) {
        console.log("confirmed gone");
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "removed
    confirmed gone
    ",
    }
  `);
});

// =========== rename ===========

test("os.rename - renames a file", async () => {
  const oldFile = workDir("rename-old.txt");
  const newFile = workDir("rename-new.txt");
  fs.writeFileSync(oldFile, "rename me");
  // Clean up target if exists
  try {
    fs.unlinkSync(newFile);
  } catch {}

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      os.rename(${JSON.stringify(oldFile)}, ${JSON.stringify(newFile)});
      console.log("renamed");

      try {
        os.stat(${JSON.stringify(oldFile)});
        console.log("ERROR: old file still exists");
      } catch(e) {
        console.log("old gone");
      }

      const st = os.stat(${JSON.stringify(newFile)});
      console.log("new exists:", st.size > 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "renamed
    old gone
    new exists: true
    ",
    }
  `);
});

// =========== realpath ===========

test("os.realpath - resolves path", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const resolved = os.realpath(".");
      console.log("type:", typeof resolved);
      console.log("absolute:", resolved.startsWith("/"));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: string
    absolute: true
    ",
    }
  `);
});

// =========== getcwd, chdir ===========

test("os.getcwd and os.chdir", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const original = os.getcwd();
      console.log("cwd type:", typeof original);
      console.log("cwd absolute:", original.startsWith("/"));

      os.chdir("/tmp");
      console.log("after chdir:", os.getcwd());

      // Restore
      os.chdir(original);
      console.log("restored:", os.getcwd() === original);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "cwd type: string
    cwd absolute: true
    after chdir: /tmp
    restored: true
    ",
    }
  `);
});

// =========== mkdir ===========

test("os.mkdir - creates directory", async () => {
  const testDir = workDir("mkdir-test");
  // Clean up if exists
  try {
    fs.rmdirSync(testDir);
  } catch {}

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = ${JSON.stringify(testDir)};
      os.mkdir(path);
      const st = os.stat(path);
      console.log("is dir:", (st.mode & os.S_IFMT) === os.S_IFDIR);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "is dir: true
    ",
    }
  `);
});

// =========== stat ===========

test("os.stat - returns file stats", async () => {
  const testFile = workDir("stat-test.txt");
  fs.writeFileSync(testFile, "hello");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const st = os.stat(${JSON.stringify(testFile)});
      console.log("dev:", typeof st.dev);
      console.log("ino:", typeof st.ino);
      console.log("mode:", typeof st.mode);
      console.log("nlink:", typeof st.nlink);
      console.log("uid:", typeof st.uid);
      console.log("gid:", typeof st.gid);
      console.log("rdev:", typeof st.rdev);
      console.log("size:", st.size);
      console.log("blocks:", typeof st.blocks);
      console.log("atime:", typeof st.atime);
      console.log("mtime:", typeof st.mtime);
      console.log("ctime:", typeof st.ctime);
      console.log("is regular:", (st.mode & os.S_IFMT) === os.S_IFREG);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "dev: number
    ino: number
    mode: number
    nlink: number
    uid: number
    gid: number
    rdev: number
    size: 5
    blocks: number
    atime: number
    mtime: number
    ctime: number
    is regular: true
    ",
    }
  `);
});

// =========== S_I* permission constants ===========

test("os.S_I* permission constants", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("S_IFMT:", typeof os.S_IFMT);
      console.log("S_IFIFO:", typeof os.S_IFIFO);
      console.log("S_IFCHR:", typeof os.S_IFCHR);
      console.log("S_IFDIR:", typeof os.S_IFDIR);
      console.log("S_IFBLK:", typeof os.S_IFBLK);
      console.log("S_IFREG:", typeof os.S_IFREG);
      console.log("S_IFSOCK:", typeof os.S_IFSOCK);
      console.log("S_IFLNK:", typeof os.S_IFLNK);
      console.log("S_ISGID:", typeof os.S_ISGID);
      console.log("S_ISUID:", typeof os.S_ISUID);
      console.log("S_IRWXU:", typeof os.S_IRWXU);
      console.log("S_IRUSR:", typeof os.S_IRUSR);
      console.log("S_IWUSR:", typeof os.S_IWUSR);
      console.log("S_IXUSR:", typeof os.S_IXUSR);
      console.log("S_IRWXG:", typeof os.S_IRWXG);
      console.log("S_IRGRP:", typeof os.S_IRGRP);
      console.log("S_IWGRP:", typeof os.S_IWGRP);
      console.log("S_IXGRP:", typeof os.S_IXGRP);
      console.log("S_IRWXO:", typeof os.S_IRWXO);
      console.log("S_IROTH:", typeof os.S_IROTH);
      console.log("S_IWOTH:", typeof os.S_IWOTH);
      console.log("S_IXOTH:", typeof os.S_IXOTH);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "S_IFMT: number
    S_IFIFO: number
    S_IFCHR: number
    S_IFDIR: number
    S_IFBLK: number
    S_IFREG: number
    S_IFSOCK: number
    S_IFLNK: number
    S_ISGID: number
    S_ISUID: number
    S_IRWXU: number
    S_IRUSR: number
    S_IWUSR: number
    S_IXUSR: number
    S_IRWXG: number
    S_IRGRP: number
    S_IWGRP: number
    S_IXGRP: number
    S_IRWXO: number
    S_IROTH: number
    S_IWOTH: number
    S_IXOTH: number
    ",
    }
  `);
});

// =========== chmod ===========

test("os.chmod - changes file mode", async () => {
  const testFile = workDir("chmod-test.txt");
  fs.writeFileSync(testFile, "chmod me");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = ${JSON.stringify(testFile)};

      os.chmod(path, 0o755);
      const st = os.stat(path);
      const perms = st.mode & 0o777;
      console.log("perms:", perms.toString(8));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "perms: 755
    ",
    }
  `);
});

// =========== access ===========

test("os.access - check file accessibility", async () => {
  const testFile = workDir("access-test.txt");
  fs.writeFileSync(testFile, "access me");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = ${JSON.stringify(testFile)};

      // Should succeed (file exists)
      os.access(path, os.F_OK);
      console.log("F_OK: ok");

      // Should succeed (readable)
      os.access(path, os.R_OK);
      console.log("R_OK: ok");

      // Should succeed (writable)
      os.access(path, os.W_OK);
      console.log("W_OK: ok");

      // Non-existent file should throw
      try {
        os.access("/nonexistent/path/file.txt", os.F_OK);
        console.log("ERROR: should have thrown");
      } catch(e) {
        console.log("nonexistent: throws");
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "F_OK: ok
    R_OK: ok
    W_OK: ok
    nonexistent: throws
    ",
    }
  `);
});

// =========== access constants ===========

test("os access constants exist", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("R_OK:", typeof os.R_OK);
      console.log("W_OK:", typeof os.W_OK);
      console.log("X_OK:", typeof os.X_OK);
      console.log("F_OK:", typeof os.F_OK);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "R_OK: number
    W_OK: number
    X_OK: number
    F_OK: number
    ",
    }
  `);
});

// =========== utimes ===========

test("os.utimes - update file times", async () => {
  const testFile = workDir("utimes-test.txt");
  fs.writeFileSync(testFile, "utimes me");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = ${JSON.stringify(testFile)};

      // Set times to a known value (in seconds since epoch)
      const targetTime = 1000000000; // Sep 8 2001
      os.utimes(path, targetTime, targetTime);

      const st = os.stat(path);
      console.log("atime:", st.atime);
      console.log("mtime:", st.mtime);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "atime: 1000000000
    mtime: 1000000000
    ",
    }
  `);
});

// =========== dup, dup2 ===========

test("os.dup - duplicates file descriptor", async () => {
  const testFile = workDir("dup-test.txt");
  fs.writeFileSync(testFile, "dup test data");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const enc = require("quickjs:encoding");
      const fd = os.open(${JSON.stringify(testFile)}, os.O_RDONLY);
      const fd2 = os.dup(fd);
      console.log("fd2 type:", typeof fd2);
      console.log("fd2 != fd:", fd2 !== fd);

      // Read from duplicated fd
      const buf = new ArrayBuffer(100);
      const n = os.read(fd2, buf, 0, 100);
      console.log("content:", enc.toUtf8(buf.slice(0, n)));

      os.close(fd);
      os.close(fd2);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "fd2 type: number
    fd2 != fd: true
    content: dup test data
    ",
    }
  `);
});

test("os.dup2 - duplicates fd to specific fd", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const [rfd, wfd] = os.pipe();
      const enc = require("quickjs:encoding");

      // dup2 write end to a new fd
      const newfd = os.dup(wfd); // get a free fd first
      os.close(newfd);
      os.dup2(wfd, newfd);

      // Write through the duplicated fd
      const data = enc.fromUtf8("dup2 test");
      os.write(newfd, data, 0, data.byteLength);
      os.close(newfd);
      os.close(wfd);

      // Read from pipe
      const buf = new ArrayBuffer(100);
      const n = os.read(rfd, buf, 0, 100);
      console.log("content:", enc.toUtf8(buf.slice(0, n)));
      os.close(rfd);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "content: dup2 test
    ",
    }
  `);
});

// =========== sleep ===========

test("os.sleep - sleeps for specified ms", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const before = Date.now();
      os.sleep(50);
      const elapsed = Date.now() - before;
      console.log("slept:", elapsed >= 40);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "slept: true
    ",
    }
  `);
});

// =========== signal ===========

test("os.signal - signal constants exist", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("SIGINT:", typeof os.SIGINT);
      console.log("SIGABRT:", typeof os.SIGABRT);
      console.log("SIGFPE:", typeof os.SIGFPE);
      console.log("SIGILL:", typeof os.SIGILL);
      console.log("SIGSEGV:", typeof os.SIGSEGV);
      console.log("SIGTERM:", typeof os.SIGTERM);
      console.log("SIGQUIT:", typeof os.SIGQUIT);
      console.log("SIGPIPE:", typeof os.SIGPIPE);
      console.log("SIGALRM:", typeof os.SIGALRM);
      console.log("SIGUSR1:", typeof os.SIGUSR1);
      console.log("SIGUSR2:", typeof os.SIGUSR2);
      console.log("SIGCHLD:", typeof os.SIGCHLD);
      console.log("SIGCONT:", typeof os.SIGCONT);
      console.log("SIGSTOP:", typeof os.SIGSTOP);
      console.log("SIGTSTP:", typeof os.SIGTSTP);
      console.log("SIGTTIN:", typeof os.SIGTTIN);
      console.log("SIGTTOU:", typeof os.SIGTTOU);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "SIGINT: number
    SIGABRT: number
    SIGFPE: number
    SIGILL: number
    SIGSEGV: number
    SIGTERM: number
    SIGQUIT: number
    SIGPIPE: number
    SIGALRM: number
    SIGUSR1: number
    SIGUSR2: number
    SIGCHLD: number
    SIGCONT: number
    SIGSTOP: number
    SIGTSTP: number
    SIGTTIN: number
    SIGTTOU: number
    ",
    }
  `);
});

test("os.signal - register and unregister handler", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      let caught = false;

      // Register handler
      os.signal(os.SIGUSR1, () => {
        caught = true;
      });

      // Send signal to self
      os.kill(os.exec(["true"], { block: false, usePath: true }), 0); // just to verify kill works
      // Actually test with self-signal - but we need getpid which is not in os
      // Instead test handler registration/unregistration
      console.log("handler set");

      // Unregister
      os.signal(os.SIGUSR1, null);
      console.log("handler cleared");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "handler set
    handler cleared
    ",
    }
  `);
});

// =========== execPath ===========

test("os.execPath - returns path to qjs binary", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const path = os.execPath();
      console.log("type:", typeof path);
      console.log("ends with qjs:", path.endsWith("qjs"));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: string
    ends with qjs: true
    ",
    }
  `);
});

// =========== gethostname ===========

test("os.gethostname - returns hostname", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const hostname = os.gethostname();
      console.log("type:", typeof hostname);
      console.log("non-empty:", hostname.length > 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: string
    non-empty: true
    ",
    }
  `);
});

// =========== platform ===========

test("os.platform - returns platform string", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const valid = ["win32", "darwin", "emscripten", "wasm", "freebsd", "linux", "unknown"];
      console.log("platform:", os.platform);
      console.log("valid:", valid.includes(os.platform));
    `,
  ]);
  await run.completion;
  expect(run.result.code).toBe(0);
  expect(run.result.stdout).toContain("valid: true");
});

// =========== WNOHANG ===========

test("os.WNOHANG constant", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("WNOHANG:", typeof os.WNOHANG, os.WNOHANG > 0);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "WNOHANG: number true
    ",
    }
  `);
});

// =========== WSTOPSIG, WIFSTOPPED, WIFCONTINUED ===========

test("os wait status functions exist", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("WEXITSTATUS:", typeof os.WEXITSTATUS);
      console.log("WTERMSIG:", typeof os.WTERMSIG);
      console.log("WSTOPSIG:", typeof os.WSTOPSIG);
      console.log("WIFEXITED:", typeof os.WIFEXITED);
      console.log("WIFSIGNALED:", typeof os.WIFSIGNALED);
      console.log("WIFSTOPPED:", typeof os.WIFSTOPPED);
      console.log("WIFCONTINUED:", typeof os.WIFCONTINUED);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "WEXITSTATUS: function
    WTERMSIG: function
    WSTOPSIG: function
    WIFEXITED: function
    WIFSIGNALED: function
    WIFSTOPPED: function
    WIFCONTINUED: function
    ",
    }
  `);
});

// =========== readdir ===========

test("os.readdir - lists directory entries", async () => {
  const testDir = workDir("readdir-test");
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(testDir + "/a.txt", "a");
  fs.writeFileSync(testDir + "/b.txt", "b");
  fs.mkdirSync(testDir + "/subdir", { recursive: true });

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const entries = os.readdir(${JSON.stringify(testDir)})
        .filter(e => e !== "." && e !== "..")
        .sort();
      console.log(JSON.stringify(entries));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "["a.txt","b.txt","subdir"]
    ",
    }
  `);
});

// =========== setReadHandler, setWriteHandler ===========

test("os.setReadHandler - detects data on pipe", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const enc = require("quickjs:encoding");

      const [rfd, wfd] = os.pipe();

      // Write data into the pipe
      const data = enc.fromUtf8("handler test");
      os.write(wfd, data, 0, data.byteLength);
      os.close(wfd);

      // Use setReadHandler to read when data is available
      let result = "";
      os.setReadHandler(rfd, () => {
        const buf = new ArrayBuffer(256);
        const n = os.read(rfd, buf, 0, 256);
        if (n > 0) {
          result += enc.toUtf8(buf.slice(0, n));
        } else {
          os.setReadHandler(rfd, null);
          os.close(rfd);
          console.log("read:", result);
          require("quickjs:cmdline").exit(0);
        }
      });
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "read: handler test
    ",
    }
  `);
});

test("os.setWriteHandler - detects pipe writable", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const enc = require("quickjs:encoding");

      const [rfd, wfd] = os.pipe();

      let written = false;
      os.setWriteHandler(wfd, () => {
        if (!written) {
          const data = enc.fromUtf8("write handler test");
          os.write(wfd, data, 0, data.byteLength);
          written = true;
          os.setWriteHandler(wfd, null);
          os.close(wfd);

          // Read it back
          const buf = new ArrayBuffer(256);
          const n = os.read(rfd, buf, 0, 256);
          console.log("read:", enc.toUtf8(buf.slice(0, n)));
          os.close(rfd);
          require("quickjs:cmdline").exit(0);
        }
      });
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "read: write handler test
    ",
    }
  `);
});

// =========== ttyGetWinSize, ttySetRaw (via PTY) ===========

test("os.ttyGetWinSize - returns size in PTY", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
      const os = require("quickjs:os");
      const size = os.ttyGetWinSize(0);
      console.log("size:", JSON.stringify(size));
    `,
    ],
    { pty: true }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchObject({
    code: 0,
    error: null,
    stderr: "",
    stdout: expect.stringMatching(/size: \[\d+,\d+\]/),
  });
});

test("os.ttyGetWinSize - returns null in when not a tty", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      const size = os.ttyGetWinSize(0);
      console.log("size:", JSON.stringify(size));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "size: null
    ",
    }
  `);
});

test("os.ttySetRaw - sets raw mode without error", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
      const os = require("quickjs:os");
      os.ttySetRaw(0);
      console.log("raw mode set");
    `,
    ],
    { pty: true }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "raw mode set
    ",
    }
  `);
});

test("os.ttySetRaw - silently fails in non-tty", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      os.ttySetRaw(0);
      console.log("raw mode set");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "raw mode set
    ",
    }
  `);
});

test("os.isatty - returns true in PTY", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
      const os = require("quickjs:os");
      console.log("isatty stdin:", os.isatty(0));
    `,
    ],
    { pty: true }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "isatty stdin: true
    ",
    }
  `);
});

test("os.isatty - returns false outside PTY", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const os = require("quickjs:os");
      console.log("isatty stdin:", os.isatty(0));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "isatty stdin: false
    ",
    }
  `);
});
