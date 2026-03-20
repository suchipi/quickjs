// Worker that does some work then exits on its own
import * as os from "quickjs:os";

console.log("worker: started");
console.log("worker: doing work");
console.log("worker: done, exiting on own");
os.Worker.parent.onmessage = null;
