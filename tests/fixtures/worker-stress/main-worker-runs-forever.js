// Main creates a worker that runs forever. Neither side cleans up.
// Used to test that SIGKILL actually kills the process.
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-infinite-loop.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    console.log("main: worker is running");
  }
};
