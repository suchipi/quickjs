// Windows variant of main-exec-with-worker.js — uses cmd.exe instead of
// echo, which is a shell builtin and not directly executable as a .exe.
import * as os from "quickjs:os";

const w = new os.Worker("./worker-wait-for-terminate.js");

w.onmessage = (event) => {
  if (event.data === "ready") {
    const ret = os.exec(["cmd.exe", "/c", "echo hello from exec"]);
    console.log("exec returned:", ret);
    w.terminate();
    console.log("done");
  }
};
