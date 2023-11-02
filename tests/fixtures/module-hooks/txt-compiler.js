import { Module } from "quickjs:module";

Module.compilers[".txt"] = (filename, content) => {
  return `export default ${JSON.stringify(content)};`;
};
