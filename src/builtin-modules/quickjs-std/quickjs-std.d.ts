// Definitions for the quickjs:std module

/** An object representing a file handle. */
declare interface FILE {
  /**
   * Human-readable description of where this FILE points.
   *
   * If `target` is a number, the FILE was opened with fdopen, and `target` is
   * the fd. Otherwise, `target` will be an arbitrary string that describes the
   * file; it may be the absolute path to the file, the relative path to the
   * file at time of its opening, or some other string like "stdin" or
   * "tmpfile".
   *
   * You should *not* use this property for anything other than logging and
   * debugging. It is *only* provided for debugging and/or troubleshooting
   * purposes. The value of this property could change at any time when
   * upgrading QuickJS or yavascript, even if upgrading by a minor or patch
   * release.
   */
  target: string | number;

  /**
   * Close the file handle. Note that for files other than stdin/stdout/stderr,
   * the file will be closed automatically when the `FILE` object is
   * garbage-collected.
   */
  close(): void;

  /** Outputs the string with the UTF-8 encoding. */
  puts(...strings: Array<string>): void;

  /**
   * Formatted printf.
   *
   * The same formats as the standard C library `printf` are supported. Integer format types (e.g. `%d`) truncate the Numbers or BigInts to 32 bits. Use the `l` modifier (e.g. `%ld`) to truncate to 64 bits.
   */
  printf(fmt: string, ...args: Array<any>): void;

  /** Flush the buffered file. Wrapper for C `fflush`. */
  flush(): void;

  /** Sync the buffered file to disk. Wrapper for C `fsync`. */
  sync(): void;

  /**
   * Seek to a given file position (whence is `std.SEEK_*`).
   *
   * `offset` can be a number or a bigint.
   */
  seek(offset: number, whence: number): void;

  /** Return the current file position. */
  tell(): number;

  /** Return the current file position as a bigint. */
  tello(): BigInt;

  /** Return true if end of file. */
  eof(): boolean;

  /** Return the associated OS handle. */
  fileno(): number;

  /** Read `length` bytes from the file to the ArrayBuffer `buffer` at byte position `position` (wrapper to the libc `fread`). Returns the number of bytes read, or `0` if the end of the file has been reached.  */
  read(buffer: ArrayBuffer, position: number, length: number): number;

  /** Write `length` bytes from the ArrayBuffer `buffer` at byte position `position` into the file (wrapper to the libc `fwrite`). Returns the number of bytes written. */
  write(buffer: ArrayBuffer, position: number, length: number): number;

  /**
   * Write this file into `target`, using a memory buffer of size `bufferSize`.
   *
   * If `limit` is specified, only that amount of bytes will be read and
   * written. Otherwise, data is read and written until this file reaches EOF.
   *
   * A `limit` of 0 is treated the same as not specifying a limit.
   *
   * Internally, this function uses libc `fread` and `fwrite` in a loop.
   *
   * Returns the number of bytes read and written.
   */
  writeTo(target: FILE, bufferSize: number, limit?: number): number;

  /**
   * Return the next line from the file, assuming UTF-8 encoding, excluding the trailing line feed or EOF.
   *
   * If the end of the file has been reached, then `null` will be returned instead of a string.
   *
   * Note: Although the trailing line feed has been removed, a carriage return (`\r`) may still be present.
   */
  getline(): string | null;

  /** Read `maxSize` bytes from the file and return them as a string assuming UTF-8 encoding. If `maxSize` is not present, the file is read up its end. */
  readAsString(maxSize?: number): string;

  /** Return the next byte from the file. Return -1 if the end of file is reached. */
  getByte(): number;

  /** Write one byte to the file. */
  putByte(value: number): void;

  /**
   * Set the buffering mode and buffer size for the file stream (wrapper to the libc `setvbuf()`).
   *
   * Note that unlike the libc setvbuf, the "buffer" argument is not supported, and therefore is not present.
   *
   * @param mode The buffering mode to use. It can be one of the following values: `std._IOFBF` for full buffering, `std._IOLBF` for line buffering, or `std._IONBF` for no buffering.
   * @param size The size to resize the internal in-memory buffer for this file to.
   */
  setvbuf(mode: number, size: number): void;
}

declare module "quickjs:std" {
  /**
   * Load the file `filename` and return it as a string assuming UTF-8 encoding.
   *
   * @param filename - The relative or absolute path to the file to load. Relative paths are resolved relative to the process's current working directory.
   */
  export function loadFile(filename: string): string;

  /**
   * Return a boolean indicating whether the provided value is a FILE object.
   *
   * @param value - The value to check.
   * @returns Whether the value was a `FILE` or not.
   */
  export function isFILE(value: any): boolean;

  /**
   * Open a file (wrapper to the libc `fopen()`).
   * Return the FILE object.
   *
   * @param filename - The relative or absolute path to the file to open. Relative paths are resolved relative to the process's current working directory.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @returns The opened FILE object.
   */
  export function open(filename: string, flags: string): FILE;

  /**
   * Open a process by creating a pipe (wrapper to the libc `popen()`).
   * Return the FILE object.
   *
   * @param command - The command line to execute. Gets passed via `/bin/sh -c`.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @returns The opened FILE object.
   */
  export function popen(command: string, flags: string): FILE;

  /**
   * Open a file from a file handle (wrapper to the libc `fdopen()`).
   * Return the FILE object.
   *
   * @param fd - The file handle to open.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @returns The opened FILE object.
   */
  export function fdopen(fd: number, flags: string): FILE;

  /**
   * Open a temporary file.
   * Return the FILE object.
   *
   * @returns The opened FILE object.
   */
  export function tmpfile(): FILE;

  /** Equivalent to `std.out.puts(str)`. */
  export function puts(...strings: Array<string>): void;

  /** Equivalent to `std.out.printf(fmt, ...args)` */
  export function printf(fmt: string, ...args: Array<any>): void;

  /** Equivalent to the libc sprintf(). */
  export function sprintf(fmt: string, ...args: Array<any>): void;

  /** Wrapper to the libc file stdin. */
  var in_: FILE;

  export { in_ as in };

  /** Wrapper to the libc file stdout. */
  export var out: FILE;

  /** Wrapper to the libc file stderr. */
  export var err: FILE;

  /** Constant for {@link FILE.seek}. Declares that pointer offset should be relative to the beginning of the file. See also libc `fseek()`. */
  export var SEEK_SET: number;

  /** Constant for {@link FILE.seek}. Declares that the offset should be relative to the current position of the FILE handle. See also libc `fseek()`. */
  export var SEEK_CUR: number;

  /** Constant for {@link FILE.seek}. Declares that the offset should be relative to the end of the file. See also libc `fseek()`. */
  export var SEEK_END: number;

  /** Constant for {@link FILE.setvbuf}. Declares that the buffer mode should be 'full buffering'. */
  export var _IOFBF: number;

  /** Constant for {@link FILE.setvbuf}. Declares that the buffer mode should be 'line buffering'. */
  export var _IOLBF: number;

  /** Constant for {@link FILE.setvbuf}. Declares that the buffer mode should be 'no buffering'. */
  export var _IONBF: number;

  /** Return the value of the environment variable `name` or `undefined` if it is not defined. */
  export function getenv(name: string): string | undefined;

  /** Set the value of the environment variable `name` to the string `value`. */
  export function setenv(name: string, value: string): void;

  /** Delete the environment variable `name`. */
  export function unsetenv(name: string): void;

  /** Return an object containing the environment variables as key-value pairs. */
  export function getenviron(): { [key: string]: string | undefined };

  /**
   * Return the real user ID of the calling process.
   *
   * This function throws an error on windows, because windows doesn't support
   * the same uid/gid paradigm as Unix-like operating systems.
   */
  export function getuid(): number;

  /**
   * Return the effective user ID of the calling process.
   *
   * This function throws an error on windows, because windows doesn't support
   * the same uid/gid paradigm as Unix-like operating systems.
   */
  export function geteuid(): number;

  /**
   * Return the real group ID of the calling process.
   *
   * This function throws an error on windows, because windows doesn't support
   * the same uid/gid paradigm as Unix-like operating systems.
   */
  export function getgid(): number;

  /**
   * Return the effective group ID of the calling process.
   *
   * This function throws an error on windows, because windows doesn't support
   * the same uid/gid paradigm as Unix-like operating systems.
   */
  export function getegid(): number;

  /** The type of the object returned by {@link getpwuid}. */
  export interface PasswdEntry {
    name: string;
    passwd: string;
    uid: number;
    gid: number;
    gecos: string;
    dir: string;
    shell: string;
  }

  /**
   * Get information from the passwd file entry for the specified user id.
   *
   * See https://linux.die.net/man/3/getpwuid.
   *
   * This function throws an error on windows, because windows doesn't support
   * the same uid/gid paradigm as Unix-like operating systems.
   */
  export function getpwuid(id: number): PasswdEntry;

  interface UrlGet {
    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string): string;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: false }): string;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { full: false }): string;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: false; full: false }): string;

    /**
     * Download `url` using the `curl` command line utility. Returns
     * ArrayBuffer when the http status code is between 200 and 299, and throws
     * otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: true }): ArrayBuffer;

    /**
     * Download `url` using the `curl` command line utility. Returns
     * ArrayBuffer when the http status code is between 200 and 299, and throws
     * otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: true; full: false }): ArrayBuffer;

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     */
    (url: string, options: { full: true }): {
      status: number;
      response: string;
      responseHeaders: string;
    };

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     */
    (url: string, options: { full: true; binary: false }): {
      status: number;
      response: string;
      responseHeaders: string;
    };

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (ArrayBuffer)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     */
    (url: string, options: { full: true; binary: true }): {
      status: number;
      response: ArrayBuffer;
      responseHeaders: string;
    };
  }

  export var urlGet: UrlGet;

  /**
   * Parse `str` using a superset of JSON.parse. The following extensions are accepted:
   *
   * - Single line and multiline comments
   * - unquoted properties (ASCII-only Javascript identifiers)
   * - trailing comma in array and object definitions
   * - single quoted strings
   * - `\f` and `\v` are accepted as space characters
   * - leading plus in numbers
   * - octal (0o prefix) and hexadecimal (0x prefix) numbers
   */
  export function parseExtJSON(str: string): any;

  /**
   * A wrapper around the standard C [strftime](https://en.cppreference.com/w/c/chrono/strftime).
   * Formats a time/date into a format as specified by the user.
   *
   * @param maxBytes - The number of bytes to allocate for the string that will be returned
   * @param format - Format string, using `%`-prefixed sequences as found in [this table](https://en.cppreference.com/w/c/chrono/strftime#Format_string).
   * @param time - The Date object (or unix timestamp, in ms) to render.
   */
  export function strftime(
    maxBytes: number,
    format: string,
    time: Date | number
  ): string;
}
