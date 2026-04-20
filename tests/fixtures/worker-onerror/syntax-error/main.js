const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error.name:", ev.error.name);
  console.log("error is SyntaxError:", ev.error instanceof SyntaxError);
  w.terminate();
};
