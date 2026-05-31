const { Worker } = require("quickjs:os");

// Empty string is a valid (empty) synthetic module: nothing runs in the
// worker, and it should start up and shut down cleanly.
const w = new Worker("/virtual/empty.js", "");
w.onerror = (event) => {
  console.log("unexpected error:", event.message);
};
