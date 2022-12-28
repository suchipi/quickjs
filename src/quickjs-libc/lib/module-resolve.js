import * as os from "os";

(() => {
  function isAbsolute(path) {
    return path[0] === "/" || /[A-Za-z]:[/\\]/.test(path);
  }

  function exists(path) {
    try {
      os.access(path, os.F_OK);
      return true;
    } catch (err) {
      return false;
    }
  }

  Module.resolve = (name, baseName) => {
    try {
      if (name[0] !== ".") {
        // if no initial dot, the module name is not modified
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
      if (exists(request)) {
        return os.realpath(request);
      }

      for (const ext of Module.searchExtensions) {
        if (typeof ext !== "string") {
          throw new Error("Module.searchExtensions contained a non-string");
        }

        if (exists(request + ext)) {
          return os.realpath(request + ext);
        }

        if (exists(request + "/index" + ext)) {
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
