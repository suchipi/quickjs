import * as std from "quickjs:std";
import * as os from "quickjs:os";

const worker = new os.Worker("./sample-worker.js");

worker.onmessage = (event) => {
  console.log("in parent, got message from worker", inspect(event));
  os.setTimeout(() => {
    std.exit(0);
  }, 10);
};

const message = {
  type: "sum",
  args: [1, 2, 3],
};
console.log("in parent, sending message to worker", inspect(message));
worker.postMessage(message);

// Annoying that you have to do this to keep it from immediately exiting...
os.setTimeout(() => {}, 1000);
