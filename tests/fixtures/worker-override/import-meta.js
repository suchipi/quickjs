const { Worker } = require("quickjs:os");

const source = `
  import * as os from "quickjs:os";
  os.Worker.parent.postMessage(import.meta.url);
`;

const fakeName = "/virtual/some-name.js";
const w = new Worker(fakeName, { overrideCode: source });
w.onmessage = (event) => {
  console.log("import.meta.url:", event.data);
  console.log("ends with fake name:", event.data.endsWith(fakeName));
  w.terminate();
};
