// Call os.exec while a worker thread is running.
// This is the scenario that triggers the macOS UE state with fork().
import * as os from "quickjs:os";

const w = new os.Worker("./worker-wait-for-terminate.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    // Worker is running — now call os.exec
    const ret = os.exec(["echo", "hello from exec"]);
    console.log("exec returned:", ret);
    w.terminate();
    console.log("done");
  }
};
