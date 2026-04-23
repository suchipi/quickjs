import * as os from "quickjs:os";

console.log("in main");
const w = new os.Worker("./worker.js");

w.onmessage = (event) => {
  if (event.data !== "ready") return;
  console.log("in main, sending try-to-exit-with-cmdline");
  w.postMessage("try-to-exit-with-cmdline");

  setTimeout(() => {
    console.log("in main, sending exit-properly");
    w.postMessage("exit-properly");
  }, 10);
};
