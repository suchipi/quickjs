import * as std from "quickjs:std";
import * as os from "quickjs:os";
import * as engine from "quickjs:engine";

engine.defineBuiltinModule("qjs-tests:my-worker", {
  __init_worker() {
    const os = require("quickjs:os");

    /** @param {any} event */
    os.Worker.parent.onmessage = (event) => {
      console.log("in worker, got message from parent", inspect(event));

      let response = null;
      const { type, args } = event.data;
      switch (type) {
        case "sum": {
          response = {
            type: "sum_result",
            result: args.reduce((prev, curr) => {
              return prev + curr;
            }, 0),
          };
        }
      }

      if (response) {
        console.log("in worker, sending response to parent", inspect(response));
        os.Worker.parent.postMessage(response);
      }
    };
  },
});

const worker = new os.Worker("qjs-tests:my-worker");

worker.onmessage = (event) => {
  console.log("in parent, got message from worker", inspect(event));
  os.setTimeout(() => {
    std.exit(0);
  }, 10);
};

const message = {
  type: "sum",
  args: [1, 2, 3],
};
console.log("in parent, sending message to worker", inspect(message));
worker.postMessage(message);

// Annoying that you have to do this to keep it from immediately exiting...
os.setTimeout(() => {}, 1000);
