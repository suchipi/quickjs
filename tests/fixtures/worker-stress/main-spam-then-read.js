// Worker spams messages, main reads them all before exiting
import * as os from "quickjs:os";

console.log("main: creating worker");
const w = new os.Worker("./worker-spam.js");

let received = 0;
w.onmessage = (event) => {
  received++;
  if (typeof event.data === "string" && event.data.startsWith("done:")) {
    console.log("main: received final message after " + received + " total");
    w.onmessage = null;
  }
};
