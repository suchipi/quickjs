// Create a worker and call terminate twice
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-infinite-loop.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    console.log("main: first terminate");
    w.terminate();
    console.log("main: second terminate");
    w.terminate();
    console.log("main: done");
  }
};
