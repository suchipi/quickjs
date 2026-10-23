const { Worker } = require("quickjs:os");

const worker = new Worker("./worker.mjs");
worker.onmessage = (event) => {
  console.log(event.data);
  worker.terminate();
};
