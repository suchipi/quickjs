import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("quickjs:context - example", async () => {
  const run = spawn(binDir("qjs"), [rootDir("examples/contexts.js")]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "TypeError: eval is not supported
    ReferenceError: 'console' is not defined
    TypeError: eval is not supported
    ",
      "stdout": "c1
    true
    false
    c2
    true
    false
    false
    c2 require
    function require() {
        [native code]
    }
    c3
    Object {
    	Object: Function "Object" {…}
    	Function: Function "Function" {…}
    	Error: Function "Error" {…}
    	EvalError: Function "EvalError" {…}
    	RangeError: Function "RangeError" {…}
    	ReferenceError: Function "ReferenceError" {…}
    	SyntaxError: Function "SyntaxError" {…}
    	TypeError: Function "TypeError" {…}
    	URIError: Function "URIError" {…}
    	InternalError: Function "InternalError" {…}
    	AggregateError: Function "AggregateError" {…}
    	Array: Function "Array" {…}
    	parseInt: Function "parseInt" {…}
    	parseFloat: Function "parseFloat" {…}
    	isNaN: Function "isNaN" {…}
    	isFinite: Function "isFinite" {…}
    	decodeURI: Function "decodeURI" {…}
    	decodeURIComponent: Function "decodeURIComponent" {…}
    	encodeURI: Function "encodeURI" {…}
    	encodeURIComponent: Function "encodeURIComponent" {…}
    	escape: Function "escape" {…}
    	unescape: Function "unescape" {…}
    	Infinity: Infinity
    	NaN: NaN
    	undefined: undefined
    	__date_clock: Function "__date_clock" {…}
    	Number: Function "Number" {…}
    	Boolean: Function "Boolean" {…}
    	String: Function "String" {…}
    	Math: Object {…}
    	Reflect: Object {…}
    	Symbol: Function "Symbol" {…}
    	eval: Function "eval" {…}
    	globalThis: -> {root}
    }
    true
    ",
    }
  `);
});

for (const modname of [
  "quickjs:bytecode",
  "quickjs:cmdline",
  "quickjs:context",
  "quickjs:encoding",
  "quickjs:engine",
  "quickjs:os",
  "quickjs:pointer",
  "quickjs:std",
  "quickjs:timers",
]) {
  test(`quickjs:context - ${modname} (default)`, async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		try {
			ctx.globalThis.require(${JSON.stringify(modname)});
			console.log("worked");
		} catch (err) {
			console.log("failed");
		}
	`,
    ]);
    await run.completion;
    expect(run.result).toMatchObject({
      stdout: "worked\n",
      stderr: "",
      code: 0,
      error: false,
    });
  });

  test(`quickjs:context - ${modname} (true)`, async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
		import { Context } from "quickjs:context";

		const ctx = new Context({
		  modules: {
			  ${JSON.stringify(modname)}: true,
			},
		});
		try {
			ctx.globalThis.require(${JSON.stringify(modname)});
			console.log("worked");
		} catch (err) {
			console.log("failed");
		}
	`,
    ]);
    await run.completion;
    expect(run.result).toMatchObject({
      stdout: "worked\n",
      stderr: "",
      code: 0,
      error: false,
    });
  });

  test(`quickjs:context - ${modname} (false)`, async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
		import { Context } from "quickjs:context";

		const ctx = new Context({
		  modules: {
			  ${JSON.stringify(modname)}: false,
			},
		});
		try {
			ctx.globalThis.require(${JSON.stringify(modname)});
			console.log("worked");
		} catch (err) {
			console.log("failed");
		}
	`,
    ]);
    await run.completion;
    expect(run.result).toMatchObject({
      stdout: "failed\n",
      stderr: "",
      code: 0,
      error: false,
    });
  });
}
