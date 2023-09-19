/**
 * A global which lets you configure the module loader (import/export/require).
 * You can use these properties to add support for importing new filetypes.
 *
 * This global can also be used to identify whether an object is a module
 * namespace record.
 */
interface ModuleGlobal {
  /**
   * Returns true if `target` is a module namespace object.
   */
  [Symbol.hasInstance](target: any): target is {
    [key: string | number | symbol]: any;
  };

  /**
   * A list of filetype extensions that may be omitted from an import specifier
   * string.
   *
   * Defaults to `[".js"]`. You can add more strings to this array to
   * make the engine search for additional files when resolving a
   * require/import.
   *
   * See the doc comment on {@link require} for more information.
   *
   * NOTE: If you add a new extension to this array, you will likely also want
   * to add to {@link Module.compilers}.
   */
  searchExtensions: Array<string>;

  /**
   * User-defined functions which will handle getting the JavaScript code
   * associated with a module.
   *
   * The key for each property in this object should be a file extension
   * string with a leading dot, eg `".jsx"`. The value for each property should
   * be a function which receives (1) the filepath to a module, and (2) that
   * file's content as a UTF-8 string, and the function should return a string
   * containing JavaScript code that corresponds to that module. In most cases,
   * these functions will compile the contents of the file from one format into JavaScript.
   *
   * The function does not have to use the second 'content' argument it
   * receives (ie. when loading binary files).
   *
   * By adding to this object, you can make it possible to import non-js
   * filetypes; compile-to-JS languages like JSX, TypeScript, and CoffeeScript
   * can be compiled at import time, and asset files like .txt files or .png
   * files can be converted into an appropriate data structure at import time.
   *
   * As an example, to make it possible to import .txt files, you might do:
   * ```js
   * import * as std from "std";
   *
   * Module.compilers[".txt"] = (filename, content) => {
   *   return `export default ${JSON.stringify(content)}`;
   * }
   * ```
   * (leveraging `JSON.stringify`'s ability to escape quotes).
   *
   * Then, later in your code, you can do:
   * ```js
   * import names from "./names.txt";
   * ```
   *
   * And `names` will be a string containing the contents of names.txt.
   *
   * NOTE: When adding to this object, you may also wish to add to
   * {@link Module.searchExtensions}.
   */
  compilers: {
    [extensionWithDot: string]: (filename: string, content: string) => string;
  };

  /**
   * Create a virtual built-in module whose exports consist of the own
   * enumerable properties of `obj`.
   */
  define(name: string, obj: { [key: string]: any }): void;

  /**
   * Resolves a require/import request from `fromFile` into a canonicalized path.
   *
   * To change native module resolution behavior, replace this function with
   * your own implementation. Note that you must handle
   * `Module.searchExtensions` yourself in your replacement implementation.
   */
  resolve(name: string, fromFile: string): string;

  /**
   * Reads the contents of the given resolved module name into a string.
   *
   * To change native module loading behavior, replace this function with your
   * own implementation. Note that you must handle `Module.compilers` yourself
   * in your replacement implementation.
   */
  read(modulePath: string): string;
}

// global added by QJMS_AddModuleGlobal
declare var Module: ModuleGlobal;

interface RequireFunction {
  /**
   * Synchronously import a module.
   *
   * `source` will be resolved relative to the calling file.
   *
   * If `source` does not have a file extension, and a file without an extension
   * cannot be found, the engine will check for files with the extensions in
   * {@link Module.searchExtensions}, and use one of those if present. This
   * behavior also happens when using normal `import` statements.
   *
   * For example, if you write:
   *
   * ```js
   * import something from "./somewhere";
   * ```
   *
   * but there's no file named `somewhere` in the same directory as the file
   * where that import appears, and `Module.searchExtensions` is the default
   * value:
   *
   * ```js
   * [".js"]
   * ```
   *
   * then the engine will look for `somewhere.js`. If that doesn't exist, the
   * engine will look for `somewhere/index.js`. If *that* doesn't exist, an error
   * will be thrown.
   *
   * If you add more extensions to `Module.searchExtensions`, then the engine
   * will use those, too. It will search in the same order as the strings appear
   * in the `Module.searchExtensions` array.
   */
  (source: string): any;

  /**
   * Resolves the normalized path to a modules, relative to the calling file.
   */
  resolve: (source: string) => string;
}

// global added by QJMS_AddRequireGlobal
declare var require: RequireFunction;

// gets set per-module by QJMS_SetModuleImportMeta
interface ImportMeta {
  /**
   * A URL representing the current module.
   *
   * Usually starts with `file://`.
   */
  url: string;

  /**
   * Whether the current module is the "main" module, meaning that it is the
   * entrypoint file that's been loaded, or, in other terms, the first
   * user-authored module that's been loaded.
   */
  main: boolean;

  /**
   * Equivalent to `globalThis.require`. Provided for compatibility with tools
   * that can leverage a CommonJS require function via `import.meta.require`.
   */
  require: RequireFunction;

  // TODO: add 'resolve' property that behaves like Node's
}
