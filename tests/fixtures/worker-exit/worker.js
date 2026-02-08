import * as cmdline from "quickjs:cmdline";
import * as os from "quickjs:os";

console.log("in worker");

os.Worker.parent.onmessage = (event) => {
  console.log("in worker, received:", inspect(event));
  if (event.data === "try-to-exit-with-cmdline") {
    cmdline.exit(1);
  } else if (event.data === "exit-properly") {
    os.Worker.parent.onmessage = null;
  }
};
