import { spawn } from "first-base";
import { binDir } from "./_utils";

test("Object.toPrimitive - normal object", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        console.log(JSON.stringify([
          Object.toPrimitive({}),
          Object.toPrimitive({}, "number"),
          Object.toPrimitive({}, "string"),
          Object.toPrimitive({}, "default"),
        ], null, 2));
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
      "stdout": "[
      "[object Object]",
      "[object Object]",
      "[object Object]",
      "[object Object]"
    ]
    ",
    }
  `);
});

test("Object.toPrimitive - string", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        console.log(JSON.stringify([
          Object.toPrimitive("47"),
          Object.toPrimitive("47", "number"),
          Object.toPrimitive("47", "string"),
          Object.toPrimitive("47", "default"),
        ], null, 2));
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
      "stdout": "[
      "47",
      "47",
      "47",
      "47"
    ]
    ",
    }
  `);
});

test("Object.toPrimitive - interaction with Symbol.toPrimitive", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const obj = {
          [Symbol.toPrimitive](hint) {
            return "hi - " + hint;
          }
        }

        console.log(JSON.stringify([
          Object.toPrimitive(obj),
          Object.toPrimitive(obj, "number"),
          Object.toPrimitive(obj, "string"),
          Object.toPrimitive(obj, "default"),
        ], null, 2));
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
      "stdout": "[
      "hi - default",
      "hi - number",
      "hi - string",
      "hi - default"
    ]
    ",
    }
  `);
});
