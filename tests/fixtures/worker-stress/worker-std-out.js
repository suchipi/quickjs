// Worker that tries to use std.out
import * as std from "quickjs:std";
import * as os from "quickjs:os";

console.log("worker: std.out is", typeof std.out);
console.log("worker: std.out.flush is", typeof std.out.flush);
std.out.flush();
console.log("worker: flush succeeded");

os.Worker.parent.postMessage("done");
