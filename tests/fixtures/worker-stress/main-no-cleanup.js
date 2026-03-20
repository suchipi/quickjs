// Main creates a worker but never calls terminate or sets onmessage to null.
// The worker exits on its own. Process should still exit cleanly.
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-self-exit.js");
console.log("main: worker created, not doing anything with it");
