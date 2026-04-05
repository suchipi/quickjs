import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

// These tests exercise (almost) all code paths through QJU_PrintError and
// QJU_ToStringValueAndPrint in quickjs-utils.c.

test("normal Error - prints message and stack", async () => {
  const run = spawn(binDir("qjs"), ["-e", `throw new Error("hello");`]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: hello
        at <eval> (<cmdline>)

    ",
      "stdout": "",
    }
  `);
});

test("thrown string - prints string, no stack", async () => {
  const run = spawn(binDir("qjs"), ["-e", `throw "some string";`]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: "some string"
    ",
      "stdout": "",
    }
  `);
});

test("thrown number - prints number, no stack", async () => {
  const run = spawn(binDir("qjs"), ["-e", `throw 42;`]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: 42
    ",
      "stdout": "",
    }
  `);
});

test("Error with overridden toString that throws - falls back to .message", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const e = new Error("the message");
      e.toString = () => { throw "nope"; };
      throw e;
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: the message
        at <eval> (<cmdline>:2)

    ",
      "stdout": "",
    }
  `);
});

test("non-error object with throwing toString - falls back to Object.prototype.toString", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `throw { toString() { throw "nope"; } };`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: [object Object]
    ",
      "stdout": "",
    }
  `);
});

test("non-error object where Object.prototype.toString also fails", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      Object.prototype.toString = () => { throw "nope"; };
      throw { toString() { throw "nope"; } };
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "thrown non-Error value: [thrown object upon which Object.prototype.toString.call(...) failed]
    ",
      "stdout": "",
    }
  `);
});

test("Error with null stack - prints message but no stack", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const e = new Error("no stack");
      Object.defineProperty(e, "stack", { value: undefined });
      throw e;
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": null,
      "stderr": "Error: no stack
    ",
      "stdout": "",
    }
  `);
});
