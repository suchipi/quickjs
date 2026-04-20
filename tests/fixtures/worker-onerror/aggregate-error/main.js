const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  console.log("is AggregateError:", ev.error instanceof AggregateError);
  console.log("message:", ev.error.message);
  console.log("errors.length:", ev.error.errors.length);
  console.log("errors[0] is TypeError:", ev.error.errors[0] instanceof TypeError);
  console.log("errors[0].message:", ev.error.errors[0].message);
  console.log("errors[1] is RangeError:", ev.error.errors[1] instanceof RangeError);
  console.log("errors[1].message:", ev.error.errors[1].message);
  w.terminate();
};
