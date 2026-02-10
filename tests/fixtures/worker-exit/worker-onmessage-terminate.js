import * as os from "quickjs:os";

console.log("in worker");

// Set up message handler so worker event loop stays alive
os.Worker.parent.onmessage = (event) => {
  console.log("in worker, received:", inspect(event));
};

// Send a message to main and then wait
// Worker will exit when main sets worker.onmessage = null,
// which closes the pipe and triggers EOF detection
os.Worker.parent.postMessage("ready");
console.log("in worker, waiting for termination");
