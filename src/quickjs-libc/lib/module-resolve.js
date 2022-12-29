import * as os from "quickjs:os";

(() => {
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

      throw new Error("import failed to resolve");
    } catch (err) {
      const newErr = new Error(
        `Failed to resolve '${name}' from '${baseName}': ${err.message}`
      );
      newErr.stack = newErr.stack + "Caused by:\n" + err.stack;
      throw newErr;
    }
  };
})();
