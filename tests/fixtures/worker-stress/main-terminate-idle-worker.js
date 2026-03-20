// Create a worker that sits idle, then terminate it
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-infinite-loop.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    console.log("main: worker is ready, terminating");
    w.terminate();
    console.log("main: done");
  }
};
