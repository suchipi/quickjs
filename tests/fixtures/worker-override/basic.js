const { Worker } = require("quickjs:os");

const source = `
  import * as os from "quickjs:os";
  os.Worker.parent.onmessage = (event) => {
    os.Worker.parent.postMessage("got: " + event.data);
  };
`;

const w = new Worker("/virtual/basic-worker.js", source);
w.onmessage = (event) => {
  console.log("parent received:", event.data);
  w.terminate();
};
w.postMessage("ping");
