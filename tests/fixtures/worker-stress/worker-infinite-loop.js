// Worker that runs a busy loop (no message handler)
import * as os from "quickjs:os";

console.log("worker: started");

os.Worker.parent.onmessage = (event) => {
  // keep event loop alive but don't do anything with messages
};

os.Worker.parent.postMessage("ready");
