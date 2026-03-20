// Worker spams messages, main terminates without reading them
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-spam.js");

setTimeout(() => {
  console.log("main: terminating worker");
  w.terminate();
  console.log("main: done");
}, 100);
