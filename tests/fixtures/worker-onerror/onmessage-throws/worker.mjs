import * as os from "quickjs:os";
os.Worker.parent.onmessage = (ev) => {
  throw new TypeError("bad msg: " + ev.data);
};
