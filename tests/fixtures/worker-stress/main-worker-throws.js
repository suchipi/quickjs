// Send a message to a worker that throws, then terminate
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-throws.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    console.log("main: sending message to trigger throw");
    w.postMessage("trigger");

    setTimeout(() => {
      console.log("main: terminating after worker threw");
      w.terminate();
      console.log("main: done");
    }, 50);
  }
};
