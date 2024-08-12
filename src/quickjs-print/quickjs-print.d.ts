/**
 * Print the arguments separated by spaces and a trailing newline.
 *
 * Non-string args are coerced into a string via [ToString](https://tc39.es/ecma262/#sec-tostring).
 * Objects can override the default `ToString` behavior by defining a `toString` method.
 */
declare var print: (...args: Array<any>) => void;

/**
 * Object that provides functions for logging information.
 */
interface Console {
  /** Same as {@link print}(). */
  log: typeof print;

  /** Same as {@link print}(). */
  warn: typeof print;

  /** Same as {@link print}(). */
  error: typeof print;

  /** Same as {@link print}(). */
  info: typeof print;
}

declare var console: Console;
