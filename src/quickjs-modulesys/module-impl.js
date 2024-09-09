import * as std from "quickjs:std";
import * as os from "quickjs:os";

(() => {
  let ModuleDelegate = __qjms_temp_ModuleDelegate;

  ModuleDelegate.read = (moduleName) => {
    if (typeof moduleName !== "string") {
      const err = new Error("moduleName must be a string");
      err.moduleName = moduleName;
      throw err;
    }
    const matches = moduleName.match(/(\.[^.]+)$/);
    const ext = matches ? matches[1] : "";

    const compilers = ModuleDelegate.compilers;
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
          `ModuleDelegate.compilers[${JSON.stringify(ext)}] was not a function`
        );
        err.compiler = userCompiler;
        throw err;
      }
      const result = userCompiler(moduleName, fileContent);
      if (typeof result !== "string") {
        const err = new Error(
          `ModuleDelegate.compilers[${JSON.stringify(ext)}] returned non-string`
        );
        err.result = result;
        throw err;
      }
      return result;
    } else {
      return fileContent;
    }
  };

  ModuleDelegate.resolve = (name, baseName) => {
    try {
      if (name.includes(":")) {
        // namespaced module
        return name;
      }

      if (name[0] !== ".") {
        // maybe something made with ModuleDelegate.define
        return name;
      }

      if (!isAbsolute(baseName)) {
        try {
          baseName = os.realpath(baseName);
        } catch (err) {
          // ignored
        }
      }

      const parts = baseName.split("/");
      const lastPart = parts[parts.length - 1];
      if (lastPart !== "." && lastPart !== "..") {
        parts.pop();
      }

      const request = [...parts, name].join("/");
      if (isValidFile(request)) {
        return os.realpath(request);
      }

      for (const ext of ModuleDelegate.searchExtensions) {
        if (typeof ext !== "string") {
          throw new Error(
            "ModuleDelegate.searchExtensions contained a non-string"
          );
        }

        if (isValidFile(request + ext)) {
          return os.realpath(request + ext);
        }

        if (isValidFile(request + "/index" + ext)) {
          return os.realpath(request + "/index" + ext);
        }
      }

      throw new Error(
        `No such file: '${request}' (using search extensions: ${JSON.stringify(
          ModuleDelegate.searchExtensions
        )})`
      );
    } catch (err) {
      const newErr = new Error(
        `Failed to resolve '${name}' from '${baseName}': ${err.message}`
      );
      newErr.stack = newErr.stack + "Caused by:\n" + err.stack;
      throw newErr;
    }
  };

  ModuleDelegate.builtinModuleNames = [
    "quickjs:std",
    "quickjs:os",
    "quickjs:bytecode",
    "quickjs:context",
    "quickjs:pointer",
    "quickjs:engine",
    "quickjs:encoding",
  ];

  function isAbsolute(path) {
    return path[0] === "/" || /[A-Za-z]:[/\\]/.test(path);
  }

  function isValidFile(path) {
    try {
      os.access(path, os.F_OK);
      const stats = os.stat(path);
      return (stats.mode & os.S_IFMT) === os.S_IFREG;
    } catch (err) {
      return false;
    }
  }
})();
