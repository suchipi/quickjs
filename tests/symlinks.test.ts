import { spawn } from "first-base";
import { rootDir, binDir, testsWorkDir, cleanResult } from "./_utils";
import fs from "fs";

const workDir = testsWorkDir.concat("symlinks");

describe("symlinks", () => {
  beforeAll(() => {
    // Clean up and recreate the work directory
    fs.rmSync(workDir(), { recursive: true, force: true });
    fs.mkdirSync(workDir(), { recursive: true });

    // Create a test file to link to
    fs.writeFileSync(workDir("target.txt"), "hello from target");

    // Create a test directory to link to
    fs.mkdirSync(workDir("target-dir"));
    fs.writeFileSync(workDir("target-dir", "inside.txt"), "inside dir");
  });

  afterAll(() => {
    fs.rmSync(workDir(), { recursive: true, force: true });
  });

  test("os.symlink creates a symlink to a file", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      os.symlink("target.txt", workDir + "/link-to-file.txt");
      console.log("symlink created");

      // Verify by reading through the symlink
      const std = require("quickjs:std");
      const f = std.open(workDir + "/link-to-file.txt", "r");
      const content = f.readAsString();
      f.close();
      console.log("content:", content);
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
      stdout: expect.stringContaining("symlink created"),
    });
    expect(cleanResult(run.result).stdout).toContain("content: hello from target");
  });

  test("os.symlink creates a symlink to a directory", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      os.symlink("target-dir", workDir + "/link-to-dir");
      console.log("symlink created");

      // Verify by listing the directory through the symlink
      const entries = os.readdir(workDir + "/link-to-dir")
        .filter(e => e !== "." && e !== "..");
      console.log("entries:", JSON.stringify(entries.sort()));
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
      stdout: expect.stringContaining("symlink created"),
    });
    expect(cleanResult(run.result).stdout).toContain('entries: ["inside.txt"]');
  });

  test("os.readlink returns the symlink target", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      // Create a symlink first
      os.symlink("target.txt", workDir + "/link-for-readlink.txt");

      // Read it back
      const target = os.readlink(workDir + "/link-for-readlink.txt");
      console.log("target:", target);
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
      stdout: expect.stringContaining("target: target.txt"),
    });
  });

  test("os.lstat returns info about the symlink itself", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      // Create a symlink
      os.symlink("target.txt", workDir + "/link-for-lstat.txt");

      // lstat should return info about the symlink
      const lstats = os.lstat(workDir + "/link-for-lstat.txt");
      const isSymlink = (lstats.mode & os.S_IFMT) === os.S_IFLNK;
      console.log("lstat sees symlink:", isSymlink);

      // stat should return info about the target
      const stats = os.stat(workDir + "/link-for-lstat.txt");
      const isRegular = (stats.mode & os.S_IFMT) === os.S_IFREG;
      console.log("stat sees regular file:", isRegular);
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("lstat sees symlink: true");
    expect(cleanResult(run.result).stdout).toContain("stat sees regular file: true");
  });

  test("os.lstat on a directory symlink", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      // Create a symlink to directory
      os.symlink("target-dir", workDir + "/link-dir-for-lstat");

      // lstat should return info about the symlink
      const lstats = os.lstat(workDir + "/link-dir-for-lstat");
      const isSymlink = (lstats.mode & os.S_IFMT) === os.S_IFLNK;
      console.log("lstat sees symlink:", isSymlink);

      // stat should return info about the target directory
      const stats = os.stat(workDir + "/link-dir-for-lstat");
      const isDir = (stats.mode & os.S_IFMT) === os.S_IFDIR;
      console.log("stat sees directory:", isDir);
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("lstat sees symlink: true");
    expect(cleanResult(run.result).stdout).toContain("stat sees directory: true");
  });

  test("S_IFLNK constant is available", async () => {
    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      console.log("S_IFLNK:", os.S_IFLNK.toString(8));
      console.log("S_IFMT:", os.S_IFMT.toString(8));
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("S_IFLNK: 120000");
    expect(cleanResult(run.result).stdout).toContain("S_IFMT: 170000");
  });

  test("os.symlink throws on failure", async () => {
    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      try {
        os.symlink("target", "/nonexistent/path/link");
        console.log("ERROR: should have thrown");
      } catch (err) {
        console.log("caught error");
      }
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("caught error");
  });

  test("os.readlink throws on non-symlink", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};
      try {
        os.readlink(workDir + "/target.txt");
        console.log("ERROR: should have thrown");
      } catch (err) {
        console.log("caught error");
      }
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("caught error");
  });

  test("os.readlink works on broken symlink", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      // Create a symlink to non-existent target
      os.symlink("nonexistent-for-readlink", workDir + "/broken-link-readlink");

      // readlink should still work - it reads the link, not the target
      const target = os.readlink(workDir + "/broken-link-readlink");
      console.log("target:", target);
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("target: nonexistent-for-readlink");
  });

  test("os.stat on broken symlink throws", async () => {
    const testWorkDir = workDir();

    const run = spawn(binDir("qjs"), ["-e", `
      const os = require("quickjs:os");
      const workDir = ${JSON.stringify(testWorkDir)};

      // Create a symlink to non-existent target
      os.symlink("nonexistent-target", workDir + "/broken-link");

      // lstat should work (returns info about the symlink)
      const lstats = os.lstat(workDir + "/broken-link");
      const isSymlink = (lstats.mode & os.S_IFMT) === os.S_IFLNK;
      console.log("lstat works on broken symlink:", isSymlink);

      // stat should fail (target doesn't exist)
      try {
        os.stat(workDir + "/broken-link");
        console.log("ERROR: stat should have thrown");
      } catch (err) {
        console.log("stat throws on broken symlink:", true);
      }
    `], { cwd: rootDir() });
    await run.completion;
    expect(cleanResult(run.result)).toMatchObject({
      code: 0,
      error: false,
    });
    expect(cleanResult(run.result).stdout).toContain("lstat works on broken symlink: true");
    expect(cleanResult(run.result).stdout).toContain("stat throws on broken symlink: true");
  });
});
