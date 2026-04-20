const { Worker } = require("quickjs:os");
/* Intentionally no .onerror — exercises the stderr fallback path for
   a non-Error reason. Should match QJU_PrintError format for strings:
   `thrown non-Error value: "plain string"` (JSON-quoted). Hold a
   reference so the Worker object lives until the error arrives. */
globalThis.__worker = new Worker("./worker.mjs");
