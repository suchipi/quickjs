const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error === null:", ev.error === null);
  console.log("message:", ev.message);
  w.terminate();
};
