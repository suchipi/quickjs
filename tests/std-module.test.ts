import { spawn } from "first-base";
import { binDir, rootDir, fixturesDir, testsWorkDir } from "./_utils";
import fs from "fs";
import http from "http";

const workDir = testsWorkDir.concat("std-module");

beforeAll(() => {
  fs.rmSync(workDir(), { recursive: true, force: true });
  fs.mkdirSync(workDir(), { recursive: true });
});

afterAll(() => {
  fs.rmSync(workDir(), { recursive: true, force: true });
});

// =========== loadFile ===========

test("std.loadFile - reads file as string", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const content = std.loadFile(${JSON.stringify(
        fixturesDir("multiline.txt")
      )});
      console.log(JSON.stringify(content));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": ""line one\\nline two\\nline three\\n"
    ",
    }
  `);
});

// =========== isFILE ===========

test("std.isFILE - returns true for FILE objects", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("stdin:", std.isFILE(std.in));
      console.log("stdout:", std.isFILE(std.out));
      console.log("stderr:", std.isFILE(std.err));
      const f = std.tmpfile();
      console.log("tmpfile:", std.isFILE(f));
      f.close();
      console.log("object:", std.isFILE({}));
      console.log("null:", std.isFILE(null));
      console.log("number:", std.isFILE(42));
      console.log("string:", std.isFILE("hello"));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "stdin: true
    stdout: true
    stderr: true
    tmpfile: true
    object: false
    null: false
    number: false
    string: false
    ",
    }
  `);
});

// =========== open, read, write, close ===========

test("std.open - read mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(fixturesDir("multiline.txt"))}, "r");
      const content = f.readAsString();
      f.close();
      console.log(JSON.stringify(content));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": ""line one\\nline two\\nline three\\n"
    ",
    }
  `);
});

test("std.open - write and read back", async () => {
  const testFile = workDir("write-test.txt");
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const path = ${JSON.stringify(testFile)};

      // Write
      const fw = std.open(path, "w");
      fw.puts("hello world");
      fw.close();

      // Read back
      const fr = std.open(path, "r");
      const content = fr.readAsString();
      fr.close();
      console.log(content);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello world
    ",
    }
  `);
});

test("std.open - append mode", async () => {
  const testFile = workDir("append-test.txt");
  fs.writeFileSync(testFile, "first\n");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const path = ${JSON.stringify(testFile)};

      const fa = std.open(path, "a");
      fa.puts("second\\n");
      fa.close();

      const fr = std.open(path, "r");
      console.log(fr.readAsString());
      fr.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "first
    second

    ",
    }
  `);
});

test("std.open - binary read/write", async () => {
  const testFile = workDir("binary-test.bin");
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const path = ${JSON.stringify(testFile)};

      // Write binary
      const fw = std.open(path, "wb");
      const buf = new ArrayBuffer(4);
      const view = new Uint8Array(buf);
      view[0] = 0xDE; view[1] = 0xAD; view[2] = 0xBE; view[3] = 0xEF;
      fw.write(buf, 0, 4);
      fw.close();

      // Read binary
      const fr = std.open(path, "rb");
      const rbuf = new ArrayBuffer(4);
      const n = fr.read(rbuf, 0, 4);
      fr.close();
      const rview = new Uint8Array(rbuf);
      console.log("bytes read:", n);
      console.log("data:", Array.from(rview).map(b => b.toString(16)).join(" "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "bytes read: 4
    data: de ad be ef
    ",
    }
  `);
});

// =========== popen ===========

test("std.popen - read from process", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.popen("echo hello_from_popen", "r");
      const content = f.readAsString();
      f.close();
      console.log("got:", content.trim());
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "got: hello_from_popen
    ",
    }
  `);
});

// =========== fdopen ===========

test("std.fdopen - open from file descriptor", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const os = require("quickjs:os");
      const path = ${JSON.stringify(fixturesDir("multiline.txt"))};

      const fd = os.open(path, os.O_RDONLY);
      const f = std.fdopen(fd, "r");
      const content = f.readAsString();
      f.close();
      console.log(JSON.stringify(content));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": ""line one\\nline two\\nline three\\n"
    ",
    }
  `);
});

// =========== tmpfile ===========

test("std.tmpfile - creates temporary file", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      console.log("isFILE:", std.isFILE(f));
      f.puts("temp data");
      f.seek(0, std.SEEK_SET);
      const content = f.readAsString();
      console.log("content:", content);
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "isFILE: true
    content: temp data
    ",
    }
  `);
});

// =========== puts, printf, sprintf ===========

test("std.puts - writes to stdout", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      std.puts("hello from puts\\n");
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hello from puts
    ",
    }
  `);
});

test("std.printf - formatted output", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      std.printf("num=%d str=%s hex=%x\\n", 42, "hi", 255);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "num=42 str=hi hex=ff
    ",
    }
  `);
});

test("std.sprintf - formatted string", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const s = std.sprintf("num=%d str=%s", 42, "hi");
      console.log(s);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "num=42 str=hi
    ",
    }
  `);
});

// =========== FILE.puts and FILE.printf ===========

test("FILE.puts - writes string to file", async () => {
  const testFile = workDir("file-puts.txt");
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(testFile)}, "w");
      f.puts("line1\\n");
      f.puts("line2\\n");
      f.close();

      const content = std.loadFile(${JSON.stringify(testFile)});
      console.log(content);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "line1
    line2

    ",
    }
  `);
});

test("FILE.printf - writes formatted string to file", async () => {
  const testFile = workDir("file-printf.txt");
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(testFile)}, "w");
      f.printf("x=%d y=%s\\n", 10, "hello");
      f.close();

      const content = std.loadFile(${JSON.stringify(testFile)});
      console.log(content);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "x=10 y=hello

    ",
    }
  `);
});

// =========== flush, sync ===========

test("FILE.flush - flushes buffer", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      f.puts("data");
      f.flush();
      console.log("flushed ok");
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "flushed ok
    ",
    }
  `);
});

test("FILE.sync - syncs to disk", async () => {
  const testFile = workDir("sync-test.txt");
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(testFile)}, "w");
      f.puts("synced data");
      f.sync();
      console.log("synced ok");
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "synced ok
    ",
    }
  `);
});

// =========== seek, tell, tello ===========

test("FILE.seek and FILE.tell", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      f.puts("abcdefghij");

      // Seek to beginning
      f.seek(0, std.SEEK_SET);
      console.log("after SEEK_SET 0:", f.tell());

      // Seek relative to current
      f.seek(3, std.SEEK_CUR);
      console.log("after SEEK_CUR 3:", f.tell());

      // Seek from end
      f.seek(-2, std.SEEK_END);
      console.log("after SEEK_END -2:", f.tell());

      // Read from current position
      const s = f.readAsString(2);
      console.log("read:", s);

      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "after SEEK_SET 0: 0
    after SEEK_CUR 3: 3
    after SEEK_END -2: 8
    read: ij
    ",
    }
  `);
});

test("FILE.tello - returns bigint position", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      f.puts("hello");
      f.seek(0, std.SEEK_SET);
      const pos = f.tello();
      console.log("type:", typeof pos);
      console.log("value:", pos.toString());
      f.seek(3, std.SEEK_CUR);
      console.log("after seek:", f.tello().toString());
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: bigint
    value: 0
    after seek: 3
    ",
    }
  `);
});

// =========== eof ===========

test("FILE.eof - detects end of file", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      f.puts("hi");
      f.seek(0, std.SEEK_SET);
      console.log("before read:", f.eof());
      f.readAsString();
      console.log("after read all:", f.eof());
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "before read: false
    after read all: true
    ",
    }
  `);
});

// =========== fileno ===========

test("FILE.fileno - returns file descriptor", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("stdin fd:", std.in.fileno());
      console.log("stdout fd:", std.out.fileno());
      console.log("stderr fd:", std.err.fileno());
      const f = std.tmpfile();
      const fd = f.fileno();
      console.log("tmpfile fd type:", typeof fd);
      console.log("tmpfile fd > 2:", fd > 2);
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "stdin fd: 0
    stdout fd: 1
    stderr fd: 2
    tmpfile fd type: number
    tmpfile fd > 2: true
    ",
    }
  `);
});

// =========== writeTo ===========

test("FILE.writeTo - copies between files", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");

      // Create source
      const src = std.tmpfile();
      src.puts("hello world from writeTo");
      src.seek(0, std.SEEK_SET);

      // Create destination
      const dst = std.tmpfile();

      // Copy
      const written = src.writeTo(dst, 1024);
      console.log("written:", written);

      // Read back
      dst.seek(0, std.SEEK_SET);
      console.log("content:", dst.readAsString());

      src.close();
      dst.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "written: 24
    content: hello world from writeTo
    ",
    }
  `);
});

test("FILE.writeTo - with limit", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");

      const src = std.tmpfile();
      src.puts("abcdefghij");
      src.seek(0, std.SEEK_SET);

      const dst = std.tmpfile();
      const written = src.writeTo(dst, 1024, 5);
      console.log("written:", written);

      dst.seek(0, std.SEEK_SET);
      console.log("content:", dst.readAsString());

      src.close();
      dst.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "written: 5
    content: abcde
    ",
    }
  `);
});

// =========== getline ===========

test("FILE.getline - reads lines", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(fixturesDir("multiline.txt"))}, "r");
      console.log("line1:", JSON.stringify(f.getline()));
      console.log("line2:", JSON.stringify(f.getline()));
      console.log("line3:", JSON.stringify(f.getline()));
      console.log("eof:", JSON.stringify(f.getline()));
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "line1: "line one"
    line2: "line two"
    line3: "line three"
    eof: null
    ",
    }
  `);
});

// =========== readAsString with maxSize ===========

test("FILE.readAsString - with maxSize", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.open(${JSON.stringify(fixturesDir("multiline.txt"))}, "r");
      const partial = f.readAsString(8);
      console.log(JSON.stringify(partial));
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": ""line one"
    ",
    }
  `);
});

// =========== getByte, putByte ===========

test("FILE.getByte and FILE.putByte", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      f.putByte(65); // 'A'
      f.putByte(66); // 'B'
      f.putByte(67); // 'C'
      f.seek(0, std.SEEK_SET);
      console.log("byte1:", f.getByte());
      console.log("byte2:", f.getByte());
      console.log("byte3:", f.getByte());
      console.log("eof:", f.getByte());
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "byte1: 65
    byte2: 66
    byte3: 67
    eof: -1
    ",
    }
  `);
});

// =========== setvbuf ===========

test("FILE.setvbuf - set buffering mode", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const f = std.tmpfile();
      // Set to unbuffered
      f.setvbuf(std._IONBF, 0);
      f.puts("unbuffered");
      f.seek(0, std.SEEK_SET);
      console.log("content:", f.readAsString());
      f.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "content: unbuffered
    ",
    }
  `);
});

// =========== FILE.target ===========

test("FILE.target - provides debug info", async () => {
  const testFile = workDir("target-test.txt");
  fs.writeFileSync(testFile, "x");

  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("stdin target:", JSON.stringify(std.in.target));
      console.log("stdout target:", JSON.stringify(std.out.target));
      console.log("stderr target:", JSON.stringify(std.err.target));

      const tmp = std.tmpfile();
      console.log("tmpfile target:", JSON.stringify(tmp.target));
      tmp.close();
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "stdin target: "stdin"
    stdout target: "stdout"
    stderr target: "stderr"
    tmpfile target: "tmpfile"
    ",
    }
  `);
});

// =========== std.in, std.out, std.err ===========

test("std.in, std.out, std.err exist and are FILEs", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("in:", std.isFILE(std.in));
      console.log("out:", std.isFILE(std.out));
      console.log("err:", std.isFILE(std.err));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "in: true
    out: true
    err: true
    ",
    }
  `);
});

// =========== Constants ===========

test("std.SEEK_* constants", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("SEEK_SET:", typeof std.SEEK_SET, std.SEEK_SET);
      console.log("SEEK_CUR:", typeof std.SEEK_CUR, std.SEEK_CUR);
      console.log("SEEK_END:", typeof std.SEEK_END, std.SEEK_END);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "SEEK_SET: number 0
    SEEK_CUR: number 1
    SEEK_END: number 2
    ",
    }
  `);
});

test("std._IO* buffer mode constants", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("_IOFBF:", typeof std._IOFBF, std._IOFBF);
      console.log("_IOLBF:", typeof std._IOLBF, std._IOLBF);
      console.log("_IONBF:", typeof std._IONBF, std._IONBF);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "_IOFBF: number 0
    _IOLBF: number 1
    _IONBF: number 2
    ",
    }
  `);
});

// =========== getenv, setenv, unsetenv, getenviron ===========

test("std.getenv - reads environment variable", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("HOME type:", typeof std.getenv("HOME"));
      console.log("NONEXISTENT:", std.getenv("QJS_TEST_NONEXISTENT_VAR_12345"));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "HOME type: string
    NONEXISTENT: undefined
    ",
    }
  `);
});

test("std.setenv and std.unsetenv", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");

      // Set a variable
      std.setenv("QJS_TEST_VAR", "hello123");
      console.log("after set:", std.getenv("QJS_TEST_VAR"));

      // Unset it
      std.unsetenv("QJS_TEST_VAR");
      console.log("after unset:", std.getenv("QJS_TEST_VAR"));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "after set: hello123
    after unset: undefined
    ",
    }
  `);
});

test("std.getenviron - returns env object", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const std = require("quickjs:std");
        const env = std.getenviron();
        console.log("type:", typeof env);
        console.log("has HOME:", "HOME" in env);
        console.log("HOME type:", typeof env.HOME);
        console.log("has TEST_VAR:", "QJS_GETENVIRON_TEST" in env);
      `,
    ],
    { env: { ...process.env, QJS_GETENVIRON_TEST: "yes" } }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "type: object
    has HOME: true
    HOME type: string
    has TEST_VAR: true
    ",
    }
  `);
});

// =========== getuid, geteuid, getgid, getegid ===========

test("std.getuid and std.geteuid", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const uid = std.getuid();
      const euid = std.geteuid();
      console.log("uid type:", typeof uid);
      console.log("euid type:", typeof euid);
      console.log("uid >= 0:", uid >= 0);
      console.log("euid >= 0:", euid >= 0);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "uid type: number
    euid type: number
    uid >= 0: true
    euid >= 0: true
    ",
    }
  `);
});

test("std.getgid and std.getegid", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const gid = std.getgid();
      const egid = std.getegid();
      console.log("gid type:", typeof gid);
      console.log("egid type:", typeof egid);
      console.log("gid >= 0:", gid >= 0);
      console.log("egid >= 0:", egid >= 0);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "gid type: number
    egid type: number
    gid >= 0: true
    egid >= 0: true
    ",
    }
  `);
});

// =========== parseExtJSON ===========

test("std.parseExtJSON - standard JSON", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const obj = std.parseExtJSON('{"a": 1, "b": "hello"}');
      console.log(JSON.stringify(obj));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"a":1,"b":"hello"}
    ",
    }
  `);
});

test("std.parseExtJSON - comments", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const obj = std.parseExtJSON(\`{
        // single line comment
        "a": 1,
        /* multi-line
           comment */
        "b": 2
      }\`);
      console.log(JSON.stringify(obj));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"a":1,"b":2}
    ",
    }
  `);
});

test("std.parseExtJSON - trailing commas", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const obj = std.parseExtJSON('{"a": 1, "b": 2,}');
      const arr = std.parseExtJSON('[1, 2, 3,]');
      console.log(JSON.stringify(obj));
      console.log(JSON.stringify(arr));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"a":1,"b":2}
    [1,2,3]
    ",
    }
  `);
});

test("std.parseExtJSON - unquoted keys", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const obj = std.parseExtJSON('{foo: 1, bar: "baz"}');
      console.log(JSON.stringify(obj));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"foo":1,"bar":"baz"}
    ",
    }
  `);
});

test("std.parseExtJSON - single quoted strings", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const obj = std.parseExtJSON("{'key': 'value'}");
      console.log(JSON.stringify(obj));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"key":"value"}
    ",
    }
  `);
});

test("std.parseExtJSON - hex and octal numbers", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const hex = std.parseExtJSON('{"val": 0xFF}');
      const oct = std.parseExtJSON('{"val": 0o77}');
      const plus = std.parseExtJSON('{"val": +42}');
      console.log("hex:", hex.val);
      console.log("oct:", oct.val);
      console.log("plus:", plus.val);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "hex: 255
    oct: 63
    plus: 42
    ",
    }
  `);
});

// =========== strftime ===========

test("std.strftime - format date", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      // Use a fixed timestamp: 2024-01-15 12:30:45 UTC = 1705318245000
      const ts = 1705318245000;
      // Format with UTC-friendly format
      const result = std.strftime(100, "%Y", ts);
      console.log("year:", result);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "year: 2024
    ",
    }
  `);
});

test("std.strftime - with Date object", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      const d = new Date(2024, 0, 15); // Jan 15 2024 local time
      const result = std.strftime(100, "%Y-%m-%d", d);
      console.log("date:", result);
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "date: 2024-01-15
    ",
    }
  `);
});

// =========== urlGet ===========

describe("std.urlGet", () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/text") {
        res.writeHead(200, {
          "Content-Type": "text/plain",
          "X-Custom": "test-header",
        });
        res.end("hello from server");
      } else if (req.url === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ key: "value" }));
      } else if (req.url === "/binary") {
        res.writeHead(200, { "Content-Type": "application/octet-stream" });
        res.end(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
      } else if (req.url === "/error") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
      } else {
        res.writeHead(200);
        res.end("ok");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test("urlGet - default returns string", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        const result = std.urlGet("http://127.0.0.1:${port}/text");
        console.log("type:", typeof result);
        console.log("value:", result);
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: string
      value: hello from server
      ",
      }
    `);
  });

  test("urlGet - binary returns ArrayBuffer", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        const result = std.urlGet("http://127.0.0.1:${port}/binary", { binary: true });
        console.log("type:", result.constructor.name);
        console.log("length:", result.byteLength);
        const view = new Uint8Array(result);
        console.log("data:", Array.from(view).map(b => b.toString(16)).join(" "));
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: ArrayBuffer
      length: 4
      data: de ad be ef
      ",
      }
    `);
  });

  test("urlGet - full returns object with status and headers", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        const result = std.urlGet("http://127.0.0.1:${port}/text", { full: true });
        console.log("type:", typeof result);
        console.log("status:", result.status);
        console.log("response type:", typeof result.response);
        console.log("response:", result.response);
        console.log("has headers:", typeof result.responseHeaders === "string");
        console.log("has x-custom:", result.responseHeaders.toLowerCase().includes("x-custom"));
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: object
      status: 200
      response type: string
      response: hello from server
      has headers: true
      has x-custom: true
      ",
      }
    `);
  });

  test("urlGet - full + binary", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        const result = std.urlGet("http://127.0.0.1:${port}/binary", { full: true, binary: true });
        console.log("status:", result.status);
        console.log("response type:", result.response.constructor.name);
        console.log("length:", result.response.byteLength);
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "status: 200
      response type: ArrayBuffer
      length: 4
      ",
      }
    `);
  });

  test("urlGet - error status throws without full option", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        try {
          std.urlGet("http://127.0.0.1:${port}/error");
          console.log("ERROR: should have thrown");
        } catch(e) {
          console.log("caught error");
        }
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught error
      ",
      }
    `);
  });

  test("urlGet - error status with full option returns status", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const std = require("quickjs:std");
        const result = std.urlGet("http://127.0.0.1:${port}/error", { full: true });
        console.log("status:", result.status);
        console.log("response:", result.response);
      `,
    ]);
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "status: 404
      response: not found
      ",
      }
    `);
  });
});
