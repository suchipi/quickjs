const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error is RangeError:", ev.error instanceof RangeError);
  console.log("error.message:", ev.error.message);
  w.terminate();
};
