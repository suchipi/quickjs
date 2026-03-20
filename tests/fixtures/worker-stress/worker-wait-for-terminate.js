// Worker that stays alive until terminated by the parent
import * as os from "quickjs:os";

os.Worker.parent.onmessage = (event) => {
  // keep event loop alive
};

os.Worker.parent.postMessage("ready");
