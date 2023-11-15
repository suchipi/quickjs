import { ModuleDelegate } from "quickjs:engine";

ModuleDelegate.compilers[".txt"] = (filename, content) => {
  return `export default ${JSON.stringify(content)};`;
};
