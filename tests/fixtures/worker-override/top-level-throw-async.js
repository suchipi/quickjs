const { Worker } = require("quickjs:os");

const source = `
  await Promise.resolve();
  throw new Error("synthetic tla boom");
`;

const fakeName = "/virtual/throwing-async.js";
const w = new Worker(fakeName, { overrideCode: source });
w.onerror = (event) => {
  console.log("error instanceof Error:", event.error instanceof Error);
  console.log("error.message:", event.error.message);
  console.log("filename ends with fake:", event.filename.endsWith(fakeName));
  w.terminate();
};
