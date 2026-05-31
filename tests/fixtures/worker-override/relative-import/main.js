import * as os from "quickjs:os";

// Derive this directory from import.meta.url (file://<abs path of main.js>),
// then point the synthetic worker's fake filename at a (non-existent) entry
// file in this same directory. Its relative import of "./helper.mjs" resolves
// against that directory and reads the real helper.mjs from disk.
const here = import.meta.url.replace(/^file:\/\//, "");
const dir = here.slice(0, here.lastIndexOf("/"));
const fakeName = dir + "/synthetic-entry.mjs";

const source = `
  import { value } from "./helper.mjs";
  import * as os from "quickjs:os";
  os.Worker.parent.postMessage(value);
`;

const w = new os.Worker(fakeName, source);
w.onmessage = (event) => {
  console.log("imported value:", event.data);
  w.terminate();
};
