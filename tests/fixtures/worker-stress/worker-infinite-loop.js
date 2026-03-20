// Worker that stays alive forever
import * as os from "quickjs:os";

os.Worker.parent.onmessage = (event) => {
  // keep event loop alive but don't do anything with messages
};

os.Worker.parent.postMessage("ready");
