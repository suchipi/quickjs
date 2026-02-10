import * as os from "quickjs:os";

console.log("in main");
const w = new os.Worker("./worker-onmessage-terminate.js");

w.onmessage = (event) => {
  console.log("in main, received:", inspect(event));
  if (event.data === "ready") {
    console.log("in main, calling worker.terminate()");
    w.terminate();
  }
};
