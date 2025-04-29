import * as os from "quickjs:os";

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
