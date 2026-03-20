// Create a worker and terminate without ever setting onmessage
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-infinite-loop.js");

// Never set w.onmessage - terminate after a delay
setTimeout(() => {
  console.log("main: terminating worker (never set onmessage)");
  w.terminate();
  console.log("main: done");
}, 50);
