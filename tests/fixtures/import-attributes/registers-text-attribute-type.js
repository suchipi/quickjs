const engine = require("quickjs:engine");

engine.ModuleDelegate.compilers["text"] = (filename, content) => {
  return `export default ${JSON.stringify(content)}`;
};
