const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("message:", ev.message);
  console.log("error instanceof Error:", ev.error instanceof Error);
  console.log("error.name:", ev.error.name);
  console.log("error.message:", ev.error.message);
  console.log("typeof lineno:", typeof ev.lineno);
  console.log("lineno > 0:", ev.lineno > 0);
  console.log("filename ends in:", ev.filename.slice(-"tla-reject-handled/worker.mjs".length));
  w.terminate();
};
