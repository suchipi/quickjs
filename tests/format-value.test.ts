import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

/* All cases run inline via `qjs -e`. The test JS programs all use the
   pattern: dynamically import quickjs:engine, call formatValue, then
   print() the result. Each test snapshots the full cleanResult() per
   .claude/rules/firstbase-inline-snapshots.md. */

function runFmt(prog: string) {
  const run = spawn(binDir("qjs"), ["-e", prog]);
  return run;
}

const prog = (body: string) =>
  `import("quickjs:engine").then(e => { ${body} });`;

test("formatValue: primitives", async () => {
  const run = runFmt(
    prog(`
    print(e.formatValue(null));
    print(e.formatValue(undefined));
    print(e.formatValue(true));
    print(e.formatValue(42));
    print(e.formatValue("hi"));
    print(e.formatValue(1.5));
    print(e.formatValue(123n));
    print(e.formatValue(Symbol("x")));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "null
    undefined
    true
    42
    "hi"
    1.5
    123n
    Symbol(x)
    ",
    }
  `);
});

test("formatValue: plain object expands at default depth", async () => {
  const run = runFmt(prog(`print(e.formatValue({ a: 1, b: "x" }));`));
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ a: 1, b: "x" }
    ",
    }
  `);
});

test("formatValue: nested object uses [Object] placeholder past default depth", async () => {
  const run = runFmt(
    prog(`
    const o = { a: { b: { c: { d: 1 } } } };
    print("default:", e.formatValue(o));
    print("maxDepth=8:", e.formatValue(o, { maxDepth: 8 }));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "default: { a: { b: [Object] } }
    maxDepth=8: { a: { b: { c: { d: 1 } } } }
    ",
    }
  `);
});

test("formatValue: dense and sparse arrays", async () => {
  const run = runFmt(
    prog(`
    print(e.formatValue([1, 2, 3]));
    const sparse = [];
    sparse[0] = "a";
    sparse.length = 5;
    print(e.formatValue(sparse));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "[ 1, 2, 3 ]
    [ "a", <4 empty items> ]
    ",
    }
  `);
});

test("formatValue: maxItemCount truncates long arrays", async () => {
  const run = runFmt(
    prog(`
    const arr = Array.from({ length: 200 }, (_, i) => i);
    const out = e.formatValue(arr);
    /* Just verify the truncation marker is present and shape is right;
       printing 100 ints would dominate the snapshot. */
    print("ends with truncation marker:", out.endsWith(", ... 100 more items ]"));
    print("starts with [ 0, 1,:", out.startsWith("[ 0, 1,"));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "ends with truncation marker: true
    starts with [ 0, 1,: true
    ",
    }
  `);
});

test("formatValue: maxStringLength truncates long strings", async () => {
  const run = runFmt(
    prog(`
    const s = "x".repeat(2000);
    const out = e.formatValue(s);
    print("contains truncation marker:", out.includes("... 1000 more characters"));
    print("starts with quoted x...:", out.startsWith('"xxxx'));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "contains truncation marker: true
    starts with quoted x...: true
    ",
    }
  `);
});

test("formatValue: showHidden controls non-enumerable visibility", async () => {
  const run = runFmt(
    prog(`
    const o = { visible: 1 };
    Object.defineProperty(o, "hidden", { value: 2, enumerable: false });
    print("default:", e.formatValue(o));
    print("showHidden:", e.formatValue(o, { showHidden: true }));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "default: { visible: 1 }
    showHidden: { visible: 1, hidden: 2 }
    ",
    }
  `);
});

test("formatValue: showClosure exposes captured closure variables (C-only superpower)", async () => {
  const run = runFmt(
    prog(`
    function makeAdder(n) { return x => x + n; }
    const add42 = makeAdder(42);
    print("default:", e.formatValue(add42));
    print("showClosure:", e.formatValue(add42, { showClosure: true }));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "default: [Function (anonymous)]
    showClosure: [Function (anonymous)] { [[Closure]]: [42 ] }
    ",
    }
  `);
});

test("formatValue: rawDump skips Proxy traps and toString/toPrimitive", async () => {
  const run = runFmt(
    prog(`
    const log = [];
    const trapping = new Proxy({ a: 1 }, {
      get(t, k) { log.push("get:" + String(k)); return Reflect.get(t, k); },
      ownKeys(t) { log.push("ownKeys"); return Reflect.ownKeys(t); },
      getOwnPropertyDescriptor(t, k) { log.push("gopd:" + String(k)); return Reflect.getOwnPropertyDescriptor(t, k); },
    });
    /* rawDump=true: traps must NOT fire. */
    const dumped = e.formatValue(trapping, { rawDump: true });
    print("after rawDump, log:", JSON.stringify(log));
    print("dump output sample:", dumped.length > 0 ? "non-empty" : "empty");
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "after rawDump, log: []
    dump output sample: non-empty
    ",
    }
  `);
});

test("formatValue: Map and Set", async () => {
  const run = runFmt(
    prog(`
    print(e.formatValue(new Map([["a", 1], ["b", 2]])));
    print(e.formatValue(new Set([10, 20, 30])));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Map(2) { "a" => 1, "b" => 2 }
    Set(3) { 10, 20, 30 }
    ",
    }
  `);
});

test("formatValue: TypedArray", async () => {
  const run = runFmt(
    prog(`
    print(e.formatValue(new Uint8Array([1, 2, 3])));
    print(e.formatValue(new Int16Array([-1, 0, 32767])));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Uint8Array(3) [ 1, 2, 3 ]
    Int16Array(3) [ -1, 0, 32767 ]
    ",
    }
  `);
});

test("formatValue: function with name, anonymous function, and arrow", async () => {
  const run = runFmt(
    prog(`
    function foo() {}
    const anon = function() {};
    const arrow = () => 1;
    print(e.formatValue(foo));
    print(e.formatValue(anon));
    print(e.formatValue(arrow));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "[Function foo]
    [Function anon]
    [Function arrow]
    ",
    }
  `);
});

test("formatValue: RegExp, Date, Error use canonical toString paths", async () => {
  const run = runFmt(
    prog(`
    print(e.formatValue(/abc/gi));
    print(e.formatValue(new Date("2026-05-04T00:00:00.000Z")));
    print(e.formatValue(new Error("oh no")));
  `)
  );
  await run.completion;
  /* The Error case includes the stack which contains a runtime path;
     just verify the prefix is present. */
  expect(run.result.code).toBe(0);
  expect(run.result.stdout).toContain("/abc/gi\n");
  expect(run.result.stdout).toContain("2026-05-04T00:00:00.000Z\n");
  expect(run.result.stdout).toContain("Error: oh no\n");
});

test("formatValue: circular reference uses [circular N] marker", async () => {
  const run = runFmt(
    prog(`
    const o = { a: 1 };
    o.self = o;
    print(e.formatValue(o));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ a: 1, self: [circular 0] }
    ",
    }
  `);
});

test("formatValue: class instance is treated as plain object", async () => {
  const run = runFmt(
    prog(`
    class Foo { constructor() { this.x = 1; } }
    print(e.formatValue(new Foo()));
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ x: 1 }
    ",
    }
  `);
});

test("__printObject writes formatted value directly to stdout (no newline)", async () => {
  const run = runFmt(
    prog(`
    e.__printObject({ a: 1 });
    print();  /* terminate the line so the snapshot is stable */
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{ a: 1 }
    ",
    }
  `);
});

test("formatValue: throws on non-object options arg", async () => {
  const run = runFmt(
    prog(`
    try {
      e.formatValue({ a: 1 }, "not an object");
    } catch (err) {
      print("caught:", err.name, err.message);
    }
  `)
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: TypeError formatValue: second argument must be an options object
    ",
    }
  `);
});
