const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("first-onerror fires");
  throw new Error("secondary from onerror");
};
