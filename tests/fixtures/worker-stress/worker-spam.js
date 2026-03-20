// Worker that sends many messages as fast as possible
import * as os from "quickjs:os";

const payload = "x".repeat(1024);
let count = 0;

os.Worker.parent.onmessage = (event) => {
  // ignored; just here so event loop stays alive
};

while (count < 500) {
  os.Worker.parent.postMessage(payload);
  count++;
}

os.Worker.parent.postMessage("done:" + count);
console.log("worker: sent " + count + " messages");
