globalThis.__qjms_temp_ModuleDelegate_init =
  function __qjms_temp_ModuleDelegate_init(
    loadFile,
    realpath,
    access,
    stat,
    F_OK,
    S_IFMT,
    S_IFREG
  ) {
    const ModuleDelegate = __qjms_temp_ModuleDelegate;
    const compilers = ModuleDelegate.compilers;

    // Loads JSON files. Registered under "json" (no leading dot) so it
    // matches `import x from "..." with { type: "json" }` by default.
    // Users wanting extension-only `.json` loading can mirror it:
    //   ModuleDelegate.compilers[".json"] = ModuleDelegate.compilers["json"];
    compilers["json"] = (filename, content, attributes) =>
      `export default JSON.parse(${JSON.stringify(content)});`;

    // Loads JSON5-flavored files via std.parseExtJSON, which accepts
    // JSON5 syntax (comments, trailing commas, unquoted keys, single
    // quotes, NaN/Infinity, .N decimals, multi-line strings, \v
    // escape). Registered under "json5" so it matches
    // `import x from "..." with { type: "json5" }` by default.
    compilers["json5"] = (filename, content, attributes) =>
      `import * as std from "quickjs:std"; export default std.parseExtJSON(${JSON.stringify(
        content
      )});`;

    ModuleDelegate.read = (moduleName, attributes) => {
      if (typeof moduleName !== "string") {
        const err = new Error("moduleName must be a string");
        err.moduleName = moduleName;
        throw err;
      }

      // Attribute-type takes precedence over file extension.
      let compilerKey = null;
      let userCompiler = null;
      if (
        attributes != null &&
        typeof attributes === "object" &&
        typeof attributes.type === "string"
      ) {
        const candidate = compilers[attributes.type];
        if (candidate != null) {
          compilerKey = attributes.type;
          userCompiler = candidate;
        }
      }
      if (userCompiler == null) {
        const matches = moduleName.match(/(\.[^.]+)$/);
        const ext = matches ? matches[1] : "";
        const candidate = compilers[ext];
        if (candidate != null) {
          compilerKey = ext;
          userCompiler = candidate;
        }
      }

      let fileContent;
      try {
        fileContent = loadFile(moduleName);
      } catch (err) {
        err.message = "Failed to load module: " + err.message;
        throw err;
      }

      if (userCompiler) {
        if (typeof userCompiler !== "function") {
          const err = new Error(
            `ModuleDelegate.compilers[${JSON.stringify(
              compilerKey
            )}] was not a function`
          );
          err.compiler = userCompiler;
          throw err;
        }
        const result = userCompiler(moduleName, fileContent, attributes);
        if (typeof result !== "string") {
          const err = new Error(
            `ModuleDelegate.compilers[${JSON.stringify(
              compilerKey
            )}] returned non-string`
          );
          err.result = result;
          throw err;
        }
        return result;
      } else {
        return fileContent;
      }
    };

    ModuleDelegate.resolve = (name, baseName, attributes) => {
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
            baseName = realpath(baseName);
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
          return realpath(request);
        }

        for (const ext of ModuleDelegate.searchExtensions) {
          if (typeof ext !== "string") {
            throw new Error(
              "ModuleDelegate.searchExtensions contained a non-string"
            );
          }

          if (isValidFile(request + ext)) {
            return realpath(request + ext);
          }

          if (isValidFile(request + "/index" + ext)) {
            return realpath(request + "/index" + ext);
          }
        }

        throw new Error(
          `No such file: '${request}' (using search extensions: ${JSON.stringify(
            ModuleDelegate.searchExtensions
          )})`
        );
      } catch (err) {
        // Build the cause's "Error: message" header explicitly: QuickJS's
        // err.stack contains only stack frames, not the V8/Node-style
        // "<name>: <message>" header. So appending err.stack after
        // "Caused by:\n" would produce a body with no visible cause
        // message. Also adopt the standard `cause` Error option so the
        // cause is programmatically inspectable, not just baked into the
        // stack string.
        const causeHeader =
          (err.name || "Error") + (err.message ? ": " + err.message : "");
        const newErr = new Error(
          `Failed to resolve '${name}' from '${baseName}': ${err.message}`,
          { cause: err }
        );
        newErr.stack =
          newErr.stack + "Caused by: " + causeHeader + "\n" + err.stack;
        throw newErr;
      }
    };

    ModuleDelegate.builtinModuleNames = [
      "quickjs:bytecode",
      "quickjs:cmdline",
      "quickjs:context",
      "quickjs:encoding",
      "quickjs:engine",
      "quickjs:os",
      "quickjs:std",
      "quickjs:timers",
    ];

    function isAbsolute(path) {
      return path[0] === "/" || /[A-Za-z]:[/\\]/.test(path);
    }

    function isValidFile(path) {
      try {
        access(path, F_OK);
        const stats = stat(path);
        return (stats.mode & S_IFMT) === S_IFREG;
      } catch (err) {
        return false;
      }
    }
  };
