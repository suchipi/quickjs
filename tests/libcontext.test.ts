import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("quickjs:context", async () => {
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
