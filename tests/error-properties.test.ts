import { spawn } from "first-base";
import { binDir } from "./_utils";

test("error properties - normal Error constructor", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const err = new Error("hi", { something: 45, somethingElse: 47 });
      console.log(inspect(err), inspect(Object.entries(err)));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Error {
    	Error: hi
    		at <eval> (<cmdline>:2)
    	
    	
    	something: 45
    	somethingElse: 47
    } [
    	[
    		"something"
    		45
    	]
    	[
    		"somethingElse"
    		47
    	]
    ]
    ",
    }
  `);
});

test("error properties - child Error constructor", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const err = new TypeError("hi", { something: 45, somethingElse: 47 });
      console.log(inspect(err), inspect(Object.entries(err)));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "TypeError {
    	TypeError: hi
    		at <eval> (<cmdline>:2)
    	
    	
    	something: 45
    	somethingElse: 47
    } [
    	[
    		"something"
    		45
    	]
    	[
    		"somethingElse"
    		47
    	]
    ]
    ",
    }
  `);
});

test("error properties - AggregateError constructor", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const err = new AggregateError([], "hi", { something: 45, somethingElse: 47 });
      console.log(inspect(err), inspect(Object.entries(err)));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "AggregateError {
    	AggregateError: hi
    		at <eval> (<cmdline>:2)
    	
    	
    	something: 45
    	somethingElse: 47
    } [
    	[
    		"something"
    		45
    	]
    	[
    		"somethingElse"
    		47
    	]
    ]
    ",
    }
  `);
});
