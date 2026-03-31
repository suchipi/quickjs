import { spawn } from "first-base";
import { binDir } from "./_utils";

test("globals", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
    console.log(); // print newline first so inline snapshot is more readable

    const PLACEHOLDER = Symbol("PLACEHOLDER");

    const globalDescriptors = Object.getOwnPropertyDescriptors(globalThis);
    for (const [key, descriptor] of Object.entries(globalDescriptors)) {
      let logLine = key + ":";

      let value;
      try {
        value = globalThis[key];
        if (typeof value === "object" && value !== null && Object.isFrozen(value)) {
          logLine += " frozen";
        }
        logLine += " " + typeof value;
      } catch (err) {
        logLine += " get throws error";
      }

      if ((descriptor.writable || descriptor.set) && key !== "undefined" && key !== "globalThis") {
        try {
          globalThis[key] = PLACEHOLDER;
          if (globalThis[key] !== PLACEHOLDER) {
            logLine += " writable but rejects new value";
          }
        } catch (err) {
          logLine += " set throws error";
        }
        try {
          globalThis[key] = value;
        } catch (err) { /* ignored */ }
      } else {
        logLine += " readonly";
      }

      logLine += " (";
      if (descriptor.get) {
        logLine += "G";
      }
      if (descriptor.set) {
        logLine += "S";
      }
      if (descriptor.configurable) {
        logLine += "C";
      }
      if (descriptor.writable) {
        logLine += "W";
      }
      if (descriptor.enumerable) {
        logLine += "E";
      }
      logLine += ")";

      console.log(logLine);
    }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "
    Object: function (CW)
    Function: function (CW)
    Error: function (CW)
    EvalError: function (CW)
    RangeError: function (CW)
    ReferenceError: function (CW)
    SyntaxError: function (CW)
    TypeError: function (CW)
    URIError: function (CW)
    InternalError: function (CW)
    AggregateError: function (CW)
    Array: function (CW)
    parseInt: function (CW)
    parseFloat: function (CW)
    isNaN: function (CW)
    isFinite: function (CW)
    decodeURI: function (CW)
    decodeURIComponent: function (CW)
    encodeURI: function (CW)
    encodeURIComponent: function (CW)
    escape: function (CW)
    unescape: function (CW)
    Infinity: number readonly ()
    NaN: number readonly ()
    undefined: undefined readonly ()
    __date_clock: function (CW)
    Number: function (CW)
    Boolean: function (CW)
    String: function (CW)
    Math: object (CW)
    Reflect: object (CW)
    Symbol: function (CW)
    eval: function (CW)
    globalThis: object readonly (CW)
    Date: function (CW)
    RegExp: function (CW)
    JSON: object (CW)
    Proxy: function (CW)
    Map: function (CW)
    Set: function (CW)
    WeakMap: function (CW)
    WeakSet: function (CW)
    ArrayBuffer: function (CW)
    SharedArrayBuffer: function (CW)
    Uint8ClampedArray: function (CW)
    Int8Array: function (CW)
    Uint8Array: function (CW)
    Int16Array: function (CW)
    Uint16Array: function (CW)
    Int32Array: function (CW)
    Uint32Array: function (CW)
    BigInt64Array: function (CW)
    BigUint64Array: function (CW)
    Float32Array: function (CW)
    Float64Array: function (CW)
    DataView: function (CW)
    Atomics: object (CW)
    Promise: function (CW)
    BigInt: function (CW)
    inspect: function (CWE)
    print: function (CWE)
    console: object (CWE)
    setTimeout: function (CWE)
    clearTimeout: function (CWE)
    setInterval: function (CWE)
    clearInterval: function (CWE)
    scriptArgs: frozen object (CWE)
    require: function (CWE)
    ",
    }
  `);
});
