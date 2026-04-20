const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
/* Assignment in the same synchronous tick as `new Worker`. The worker's
   error pipe is never polled until the next event-loop iteration, so
   .onerror is in place before any dispatch. */
w.onerror = (ev) => {
  console.log("same-tick onerror fired");
  w.terminate();
};
