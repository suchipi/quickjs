declare module "quickjs:engine" {
  /**
   * Return whether the provided resolved module path is set as the main module.
   *
   * In other words, return what the value of `import.meta.main` would be within
   * the module.
   *
   * The main module can be set via {@link setMainModule}.
   */
  export function isMainModule(resolvedFilepath: string): boolean;

  /**
   * Set the main module to the module with the provided resolved path.
   *
   * This will affect the value of `import.meta.main` for modules loaded in the
   * future, but it will NOT retroactively change the value of
   * `import.meta.main` in existing already-loaded modules.
   */
  export function setMainModule(resolvedFilepath: string): void;

  /**
   * Evaluate the string `code` as a script (global eval).
   *
   * @param code - The code to evaluate.
   * @param options - An optional object containing the following optional properties:
   * @property backtraceBarrier - Boolean (default = false). If true, error backtraces do not list the stack frames below the evalScript.
   * @property filename - String (default = "<evalScript>"). The filename to associate with the code being executed.
   * @property async - Boolean (default = false). If true, `await` is accepted at the top level of `code` and a Promise is returned.
   * @returns The result of the evaluation. If `async` is true, a Promise.
   */
  export function evalScript(
    code: string,
    options?: { backtraceBarrier?: boolean; filename?: string; async?: boolean }
  ): any;

  /**
   * Evaluate the file `filename` as a script (global eval).
   *
   * @param filename - The relative or absolute path to the file to load. Relative paths are resolved relative to the process's current working directory.
   * @returns The result of the evaluation.
   */
  export function runScript(filename: string): any;

  /**
   * Evaluate the file `filename` as a module. Effectively a synchronous dynamic `import()`.
   *
   * @param filename - The relative or absolute path to the file to import. Relative paths are resolved relative to the file calling `importModule`, or `basename` if present.
   * @param basename - If present and `filename` is a relative path, `filename` will be resolved relative to this basename.
   * @returns The result of the evaluation (module namespace object).
   */
  export function importModule(
    filename: string,
    basename?: string
  ): { [key: string]: any };

  /**
   * Return the resolved path to a module.
   *
   * @param filename - The relative or absolute path to the file to import. Relative paths are resolved relative to the file calling `importModule`, or `basename` if present.
   * @param basename - If present and `filename` is a relative path, `filename` will be resolved relative to this basename.
   * @returns The resolved module path.
   */
  export function resolveModule(filename: string, basename?: string): string;

  /**
   * Read the script of module filename from an active stack frame, then return it as a string.
   *
   * If there isn't a valid filename for the specified stack frame, an error will be thrown.
   *
   * @param stackLevels - How many levels up the stack to search for a filename. Defaults to 0, which uses the current stack frame.
   */
  export function getFileNameFromStack(stackLevels?: number): string;

  /**
   * Returns true if `target` is a module namespace object.
   */
  export function isModuleNamespace(target: any): boolean;

  /**
   * Create a virtual built-in module whose exports consist of the own
   * enumerable properties of `obj`.
   */
  export function defineBuiltinModule(
    name: string,
    obj: { [key: string]: any }
  ): void;

  /**
   * An object which lets you configure the module loader (import/export/require).
   * You can change these properties to add support for importing new filetypes.
   */
  export const ModuleDelegate: ModuleDelegate;

  /**
   * Manually invoke the cycle removal algorithm (garbage collector).
   *
   * The cycle removal algorithm is automatically started when needed, so this
   * function is useful in case of specific memory constraints or for testing.
   */
  export function gc(): void;

  /**
   * Format a value for debugging using QuickJS's built-in C-level printer.
   *
   * This is a parallel formatter to {@link inspect} — it uses the engine's
   * internal pretty-printer (the same one used by `JS_PrintValue` in the C
   * API). It can show things JS cannot, like the closure variables of a
   * function (with `showClosure: true`), and runs without invoking any
   * user-defined `toString` / `[Symbol.toPrimitive]` / Proxy traps in
   * `rawDump` mode.
   *
   * For typical script-level value formatting, `inspect()` is usually a
   * better choice — it is more configurable, handles cycles via path
   * strings, and supports custom formatters via `inspect.custom`. Reach for
   * `formatValue` when you need C-level introspection (closure access) or
   * a side-effect-free dump (`rawDump`).
   *
   * @param value - The value to format.
   * @param options - Optional formatting options.
   * @property showHidden - Boolean (default = false). Include non-enumerable properties.
   * @property showClosure - Boolean (default = false). For functions, include closure variables and home object.
   * @property rawDump - Boolean (default = false). Skip toString/toPrimitive/Proxy traps; print raw structural info.
   * @property maxDepth - Number (default = 2, hard cap = 8). Recursion limit. Set to 0 for the hard cap.
   * @property maxStringLength - Number (default = 1000). Truncate strings longer than this. Set to 0 for unlimited.
   * @property maxItemCount - Number (default = 100). Truncate arrays/objects with more entries than this. Set to 0 for unlimited.
   * @returns The formatted string.
   */
  export function formatValue(
    value: any,
    options?: {
      showHidden?: boolean;
      showClosure?: boolean;
      rawDump?: boolean;
      maxDepth?: number;
      maxStringLength?: number;
      maxItemCount?: number;
    }
  ): string;

  /**
   * Format a value using QuickJS's built-in C-level printer and write the
   * result directly to stdout (no trailing newline).
   *
   * Equivalent in spirit to `process.stdout.write(formatValue(value))`,
   * but writes directly via the C API without building a JS string in
   * between. Provided for API parity with the underlying `JS_PrintValue`
   * C API.
   *
   * The `__` prefix marks this as a direct mirror of upstream QuickJS's
   * `std.__printObject` API (relocated to `quickjs:engine` in this fork
   * because the fork has been moving `std` helpers to `engine`).
   *
   * @param value - The value to print.
   */
  export function __printObject(value: any): void;
}
