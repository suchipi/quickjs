const { Worker } = require("quickjs:os");
/* Hold a reference so the Worker object lives until the error arrives —
   an unreferenced Worker may be GC'd and the err_handler freed before
   the pipe is polled. */
globalThis.__worker = new Worker("./worker.mjs");
/* no .onerror set — worker's TLA rejection falls through to the stderr
   fallback path in handle_posted_error. */
