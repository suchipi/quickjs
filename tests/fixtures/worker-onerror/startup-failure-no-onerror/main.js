const { Worker } = require("quickjs:os");

// Regression test: a worker whose entry module fails to load, with the parent
// having set onmessage but NOT onerror, must not hang the process. The worker
// closing its send pipe on exit lets the parent's onmessage port reach EOF so
// the event loop can drain. The startup error falls back to stderr (no onerror).
const w = new Worker("./worker.mjs");
w.onmessage = (event) => {
  console.log("unexpectedly received a message:", event.data);
  w.terminate();
};
