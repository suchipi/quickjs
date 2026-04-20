const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error.code:", ev.error.code);
  console.log("error.detail.kind:", ev.error.detail.kind);
  console.log("error.message:", ev.error.message);
  w.terminate();
};
