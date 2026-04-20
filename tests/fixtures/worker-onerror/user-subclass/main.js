const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error is Error:", ev.error instanceof Error);
  console.log("error.name:", ev.error.name);
  console.log("error.message:", ev.error.message);
  console.log("error.code:", ev.error.code);
  w.terminate();
};
