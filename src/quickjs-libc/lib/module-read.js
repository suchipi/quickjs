import * as std from "std";

(() => {
  Module.read = (moduleName) => {
    if (typeof moduleName !== "string") {
      const err = new Error("moduleName must be a string");
      err.moduleName = moduleName;
      throw err;
    }
    const matches = moduleName.match(/\.([^.]+)$/);
    const ext = matches ? matches[1] : "";

    const compilers = globalThis.Module.compilers;
    const userCompiler = compilers[ext];

    let fileContent;
    try {
      fileContent = std.loadFile(moduleName);
    } catch (err) {
      err.message = "Failed to load module: " + err.message;
      throw err;
    }

    if (userCompiler) {
      if (typeof userCompiler !== "function") {
        const err = new Error(
          `Module.compilers[${JSON.stringify(ext)}] was not a function`
        );
        err.compiler = userCompiler;
        throw err;
      }
      const result = userCompiler(moduleName, fileContent);
      if (typeof result !== "string") {
        const err = new Error(
          `Module.compilers[${JSON.stringify(ext)}] returned non-string`
        );
        err.result = result;
        throw err;
      }
      return result;
    } else {
      return fileContent;
    }
  };
})();
