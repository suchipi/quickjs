// Worker that throws during message handling
import * as os from "quickjs:os";

console.log("worker: started");

os.Worker.parent.onmessage = (event) => {
  console.log("worker: received message, throwing");
  throw new Error("worker error");
};

os.Worker.parent.postMessage("ready");
