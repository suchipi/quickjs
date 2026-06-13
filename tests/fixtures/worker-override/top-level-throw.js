const { Worker } = require("quickjs:os");

const source = `throw new Error("synthetic boom");`;

const fakeName = "/virtual/throwing.js";
const w = new Worker(fakeName, { overrideCode: source });
w.onerror = (event) => {
  console.log("error instanceof Error:", event.error instanceof Error);
  console.log("error.message:", event.error.message);
  console.log("filename ends with fake:", event.filename.endsWith(fakeName));
  w.terminate();
};
