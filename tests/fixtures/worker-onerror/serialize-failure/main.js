const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error is Error:", ev.error instanceof Error);
  /* The meta-error's message starts with a fixed prefix telling the
     user serialization failed. */
  console.log("message prefix:",
    ev.error.message.startsWith("failed to serialize worker error"));
  console.log("has originalReasonString:",
    typeof ev.error.originalReasonString === "string");
  w.terminate();
};
