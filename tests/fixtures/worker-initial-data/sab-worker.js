import * as os from "quickjs:os";

const view = new Uint8Array(os.Worker.initialData.sab);
view[0] = 123;
os.Worker.parent.postMessage("done");
