import { spawn } from "first-base";
import { binDir } from "./_utils";

test("Symbol.typeofValue - normal behavior", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = { [Symbol.typeofValue]() { return "string"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "string
    ",
    }
  `);
});

// typeof is not allowed to throw. if a @@typeofValue method throws,
// then that exception is eaten up, and the typeof resolves to "object".
test("Symbol.typeofValue - method throws", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = { [Symbol.typeofValue]() { throw "bad"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "object
    ",
    }
  `);
});

// typeof is not allowed to throw. if a @@typeofValue method throws,
// then that exception is eaten up, and the typeof resolves to "object".
test("Symbol.typeofValue - accessing the method throws", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = { get [Symbol.typeofValue]() { throw "bad"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "object
    ",
    }
  `);
});

// @@typeofValue functions are not allowed to return values that typeof
// wouldn't normally return. If they try to, the typeof resolves to "object".
test("Symbol.typeofValue - returning weird value", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = { [Symbol.typeofValue]() { return "weird"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "object
    ",
    }
  `);
});

// here, we are throwing a builtin quickjs atom, so no allocation takes place,
// but this is still disallowed in order to maintain the contract typeof has
// with user code.
test("Symbol.typeofValue - returning weird value 2", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = { [Symbol.typeofValue]() { return "default"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "object
    ",
    }
  `);
});

// here, we are throwing a builtin quickjs atom, so no allocation takes place,
// but this is still disallowed in order to maintain the contract typeof has
// with user code.
test("Symbol.typeofValue - returning weird value 3", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        // There might be an alternate universe where the harmony:typeof_null
        // proposal passed... but it's not this universe
        const obj = { [Symbol.typeofValue]() { return "null"; } };
        console.log(typeof obj);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "object
    ",
    }
  `);
});

test("Symbol.typeofValue - allowed return values (non-bignum)", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        for (const value of [
          "undefined",
          "object",
          "boolean",
          "number",
          "string",
          "symbol",
          "function"
        ]) {
          const obj = { [Symbol.typeofValue]() { return value; } };
          if (typeof obj !== value) {
            throw new Error("Failed: " + value);
          }
        }

        console.log("All good!");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "All good!
    ",
    }
  `);
});

// if you are not compiling with CONFIG_BIGNUM, this test is expected to fail.
test("Symbol.typeofValue - allowed return values (bignum-specific)", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        for (const value of [
          "bigint",
          "bigfloat",
          "bigdecimal",
        ]) {
          const obj = { [Symbol.typeofValue]() { return value; } };
          if (typeof obj !== value) {
            throw new Error("Failed: " + value);
          }
        }

        console.log("All good!");
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "All good!
    ",
    }
  `);
});

// a naive implementation of `typeofValue` handling may always return "object"
// when the typeofValue method is not suitable. However, it should return
// "function" when the object is callable.
test("Symbol.typeofValue - invalid method retains 'function' for callables", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        function myFunc() {}
        // As demonstrated in earlier tests, this is not valid.
        myFunc[Symbol.typeofValue] = () => "potato";
        console.log(typeof myFunc);
      `,
    ],
    { cwd: __dirname }
  );
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "function
    ",
    }
  `);
});
