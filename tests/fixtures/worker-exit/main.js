import * as os from "quickjs:os";

console.log("in main");
const w = new os.Worker("./worker.js");

setTimeout(() => {
  w.postMessage("try-to-exit");
  console.log("in main, sending try-to-exit");
}, 10);
