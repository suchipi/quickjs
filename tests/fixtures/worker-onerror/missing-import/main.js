const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("error.name:", ev.error.name);
  console.log("error is Error:", ev.error instanceof Error);
  console.log("message contains 'does-not-exist':",
    ev.error.message.includes("does-not-exist"));
  w.terminate();
};
