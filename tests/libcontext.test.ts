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

test("quickjs:context - quickjs:bytecode option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:bytecode");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:bytecode option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:bytecode": true,
			},
		});
		ctx.globalThis.require("quickjs:bytecode");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:bytecode option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:bytecode": false,
			},
		});
		ctx.globalThis.require("quickjs:bytecode");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:bytecode)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:cmdline option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:cmdline");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:cmdline option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:cmdline": true,
			},
		});
		ctx.globalThis.require("quickjs:cmdline");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:cmdline option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:cmdline": false,
			},
		});
		ctx.globalThis.require("quickjs:cmdline");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:cmdline)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:context option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:context");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:context option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:context": true,
			},
		});
		ctx.globalThis.require("quickjs:context");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:context option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:context": false,
			},
		});
		ctx.globalThis.require("quickjs:context");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:context)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:encoding option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:encoding");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:encoding option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:encoding": true,
			},
		});
		ctx.globalThis.require("quickjs:encoding");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:encoding option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:encoding": false,
			},
		});
		ctx.globalThis.require("quickjs:encoding");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:encoding)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:engine option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:engine");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:engine option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:engine": true,
			},
		});
		ctx.globalThis.require("quickjs:engine");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:engine option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:engine": false,
			},
		});
		ctx.globalThis.require("quickjs:engine");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:engine)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:os option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:os");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:os option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:os": true,
			},
		});
		ctx.globalThis.require("quickjs:os");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:os option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:os": false,
			},
		});
		ctx.globalThis.require("quickjs:os");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:os)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:std option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:std");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:std option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:std": true,
			},
		});
		ctx.globalThis.require("quickjs:std");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:std option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:std": false,
			},
		});
		ctx.globalThis.require("quickjs:std");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:std)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:timers option (default value)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context();
		ctx.globalThis.require("quickjs:timers");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:timers option (true)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:timers": true,
			},
		});
		ctx.globalThis.require("quickjs:timers");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "",
    }
  `);
});

test("quickjs:context - quickjs:timers option (false)", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
		import { Context } from "quickjs:context";

		const ctx = new Context({
      moduleGlobals: true,
		  modules: {
			  "quickjs:timers": false,
			},
		});
		ctx.globalThis.require("quickjs:timers");
	`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 1,
      "error": false,
      "stderr": "Error: Failed to load module: No such file or directory (errno = 2, filename = quickjs:timers)
        at <internal>/quickjs-std.c:307
        at loadFile (native)
        at <anonymous> (src/quickjs-modulesys/module-impl.js:27)
        at require (native)
        at <anonymous> (<cmdline>:10)

    ",
      "stdout": "",
    }
  `);
});
