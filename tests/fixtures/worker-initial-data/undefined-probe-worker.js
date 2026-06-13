import * as os from "quickjs:os";

os.Worker.parent.postMessage({
  isUndefined: os.Worker.initialData === undefined,
});
