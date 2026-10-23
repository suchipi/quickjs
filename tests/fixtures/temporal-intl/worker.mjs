import { Worker } from "quickjs:os";

Worker.parent.postMessage(`worker: ${typeof Temporal} ${typeof Intl}`);
