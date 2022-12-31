import * as std from "quickjs:std";

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

const preact = require("https://unpkg.com/preact@10.11.3/dist/preact.min.js");
console.log(typeof preact.render);
