// Terminate a worker, then try to postMessage to it
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-infinite-loop.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    console.log("main: terminating");
    w.terminate();
    console.log("main: posting after terminate");
    try {
      w.postMessage("hello");
      console.log("main: postMessage succeeded");
    } catch (e) {
      console.log("main: postMessage threw: " + e.message);
    }
    console.log("main: done");
  }
};
