// Test that std.out works in workers
import * as os from "quickjs:os";

const w = new os.Worker("./worker-std-out.js");

w.onmessage = (event) => {
  if (event.data === "done") {
    console.log("main: worker finished");
    w.onmessage = null;
  }
};
