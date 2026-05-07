import * as os from "quickjs:os";

console.log("in main");
const w = new os.Worker("./worker.js");

w.onmessage = (event) => {
  if (event.data !== "ready") return;
  console.log("in main, sending try-to-exit");
  w.postMessage("try-to-exit");
  // Keep main alive long enough for the worker to receive the message,
  // call cmdline.exit, and have the resulting error propagate back via
  // the error pipe. After that, drop the message handler so main exits.
  setTimeout(() => { w.onmessage = null; }, 200);
};
