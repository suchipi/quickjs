const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
let callCount = 0;
w.onerror = (ev) => {
  callCount += 1;
  console.log("onerror fired, count=" + callCount);
  console.log("error.message:", ev.error.message);
  /* Give the late .catch a chance to attach before terminating. The
     tracker should NOT fire onerror again on the is_handled=TRUE call. */
  setTimeout(() => {
    console.log("final call count:", callCount);
    w.terminate();
  }, 50);
};
