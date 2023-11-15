import { ModuleDelegate } from "quickjs:module";

ModuleDelegate.compilers[".txt"] = (filename, content) => {
  return `export default ${JSON.stringify(content)};`;
};
