import * as std from "quickjs:std";
import * as os from "quickjs:os";

// Define Module.read
(() => {
  if (typeof Module !== "object") return;
  if (Module == null) return;

  if (typeof Module.read === "function") return;
  Module.read = (moduleName) => {
    if (typeof moduleName !== "string") {
      const err = new Error("moduleName must be a string");
      err.moduleName = moduleName;
      throw err;
    }
    const matches = moduleName.match(/(\.[^.]+)$/);
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

// Define Module.resolve
(() => {
  if (typeof Module !== "object") return;
  if (Module == null) return;

  if (typeof Module.resolve === "function") return;

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

  Module.resolve = (name, baseName) => {
    try {
      if (name.includes(":")) {
        // namespaced module
        return name;
      }

      if (name[0] !== ".") {
        // maybe something made with Module.define
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

      for (const ext of Module.searchExtensions) {
        if (typeof ext !== "string") {
          throw new Error("Module.searchExtensions contained a non-string");
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
          Module.searchExtensions
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
})();
