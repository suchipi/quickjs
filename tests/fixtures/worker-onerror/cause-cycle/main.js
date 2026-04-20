const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error is Error:", ev.error instanceof Error);
  console.log("message:", ev.error.message);
  console.log("cause === error (cycle preserved):", ev.error.cause === ev.error);
  w.terminate();
};
