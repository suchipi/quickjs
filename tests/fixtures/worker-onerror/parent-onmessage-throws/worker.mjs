import * as os from "quickjs:os";
os.Worker.parent.postMessage("ping");
os.Worker.parent.onmessage = null;
