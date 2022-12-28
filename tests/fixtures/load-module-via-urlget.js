import * as std from "std";

const HTTP_RE = /^https?:\/\//;

const defaultResolve = Module.resolve;
Module.resolve = (name, fromFile) => {
  if (HTTP_RE.test(name)) {
    return name;
  }
  return defaultResolve(name, fromFile);
};

const defaultRead = Module.read;
Module.read = (moduleName) => {
  if (HTTP_RE.test(moduleName)) {
    return std.urlGet(moduleName);
  }
  return defaultRead(moduleName);
};

// preact tries to do 'self.preact = ...', so we need to make sure there's a
// 'self' for it to assign onto
globalThis.self = globalThis;

require("https://unpkg.com/preact@10.11.3/dist/preact.min.js");

// 'preact' global should now be available
console.log(typeof preact.render);
