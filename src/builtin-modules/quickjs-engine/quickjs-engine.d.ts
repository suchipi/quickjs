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
   * @returns The result of the evaluation.
   */
  export function evalScript(
    code: string,
    options?: { backtraceBarrier?: boolean; filename?: string }
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
}
