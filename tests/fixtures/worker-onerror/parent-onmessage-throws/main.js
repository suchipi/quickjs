const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
let onerrorCallCount = 0;
w.onerror = (ev) => {
  onerrorCallCount += 1;
  console.log("onerror fired (should not):", ev.error && ev.error.message);
};
w.onmessage = (m) => {
  console.log("about to throw from parent onmessage");
  throw new Error("parent bug");
};
