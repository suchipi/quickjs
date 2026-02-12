import { Context } from "quickjs:context";

console.log("c1");
const c1 = new Context();
console.log(c1.eval("Array") === c1.globalThis.Array); // true
console.log(c1.eval("Array") === globalThis.Array); // false

console.log("c2");
const c2 = new Context();
console.log(c2.eval("Array") === c2.globalThis.Array); // true
console.log(c2.eval("Array") === c1.globalThis.Array); // false
console.log(c2.eval("Array") === globalThis.Array); // false

console.log("c2 require");
console.log(c2.globalThis.require);

console.log("c3");
// all the options:
const c3 = new Context({
  // All of these options default to true
  date: false,
  eval: false,
  stringNormalize: false,
  regExp: false,
  json: false,
  proxy: false,
  mapSet: false,
  typedArrays: false,
  promise: false,
  bigint: false,
  bigfloat: false,
  bigdecimal: false,
  operators: false,
  useMath: false,
  inspect: false,
  console: false,
  print: false,
  moduleGlobals: false,
  timers: false,
  modules: {
    "quickjs:bytecode": false,
    "quickjs:cmdline": false,
    "quickjs:context": false,
    "quickjs:encoding": false,
    "quickjs:engine": false,
    "quickjs:os": false,
    "quickjs:std": false,
    "quickjs:timers": false,
  },
});

// Not much here
console.log(inspect(c3.globalThis, { all: true, maxDepth: 1 }));

// the context's 'eval' function still works even if eval is disabled:
console.log(c3.eval("Array") === c3.globalThis.Array);

try {
  // TypeError: eval is not supported
  c3.eval("eval('hi')");
} catch (err) {
  console.error(err);
}

try {
  // TypeError: 'console' is not defined
  c3.eval("console.log(2 + 2)");
} catch (err) {
  console.error(err);
}

try {
  // TypeError: eval is not supported
  c3.eval("f = new Function('return 2 + 2'); f();");
} catch (err) {
  console.error(err);
}
