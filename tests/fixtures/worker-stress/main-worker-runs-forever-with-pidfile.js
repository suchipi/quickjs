// Same as main-worker-runs-forever.js, but writes the qjs.exe pid to
// the path passed via QJS_PID_FILE env var before starting the worker.
// Used by the Wine taskkill test to find the embedded qjs.exe pid (vs
// the wine wrapper's pid that first-base sees).
import * as os from "quickjs:os";
import * as std from "quickjs:std";

const pidPath = std.getenv("QJS_PID_FILE");
const f = std.open(pidPath, "w");
f.puts(String(os.getpid()));
f.close();

new os.Worker("./worker-infinite-loop.js");
