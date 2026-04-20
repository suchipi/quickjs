const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error is TypeError:", ev.error instanceof TypeError);
  console.log("error.message:", ev.error.message);
  w.terminate();
};
w.postMessage("boom");
