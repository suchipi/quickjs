/**
 * The `"quickjs:cmdline"` module provides access to command line arguments
 * and process exit code management.
 *
 * It can be imported using either of these forms:
 * ```js
 * import * as cmdline from "quickjs:cmdline";
 * import { scriptArgs, exit } from "quickjs:cmdline";
 * ```
 */
declare module "quickjs:cmdline" {
  /**
   * Returns the command line arguments. The first element is the script name.
   *
   * Note: The global `scriptArgs` variable is also available and is the
   * preferred way to access command line arguments.
   */
  export function getScriptArgs(): Array<string>;

  /**
   * Terminates the process with the given exit code.
   * If no exit code is provided, defaults to 0.
   */
  export function exit(exitCode?: number): never;

  /**
   * Gets the current exit code (as set by setExitCode or errors).
   */
  export function getExitCode(): number;

  /**
   * Sets the exit code to be returned when the process exits.
   * This does not terminate the process; it only sets the code
   * that will be returned when the process eventually exits.
   */
  export function setExitCode(exitCode: number): void;
}

/**
 * Provides the command line arguments. The first element is the script name.
 *
 * This is a global variable that is set by the host environment.
 */
declare var scriptArgs: Array<string>;
