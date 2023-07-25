// Definitions of the globals and modules added by quickjs-libc

/**
 * Provides the command line arguments. The first argument is the script name.
 */
declare var scriptArgs: Array<string>;

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
   * upgrading yavascript, even if upgrading by a minor or patch release.
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
   * Exit the process with the provided status code.
   *
   * @param statusCode The exit code; 0 for success, nonzero for failure.
   */
  export function exit(statusCode: number): void;

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
  export function loadScript(filename: string): any;

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
   * Load the file `filename` and return it as a string assuming UTF-8 encoding.
   *
   * @param filename - The relative or absolute path to the file to load. Relative paths are resolved relative to the process's current working directory.
   */
  export function loadFile(filename: string): string;

  /**
   * Read the script of module filename from an active stack frame, then return it as a string.
   *
   * If there isn't a valid filename for the specified stack frame, an error will be thrown.
   *
   * @param stackLevels - How many levels up the stack to search for a filename. Defaults to 0, which uses the current stack frame.
   */
  export function getFileNameFromStack(stackLevels?: number): string;

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

  /** Manually invoke the cycle removal algorithm (garbage collector). The cycle removal algorithm is automatically started when needed, so this function is useful in case of specific memory constraints or for testing. */
  export function gc(): void;

  /** Return the value of the environment variable `name` or `undefined` if it is not defined. */
  export function getenv(name: string): string | undefined;

  /** Set the value of the environment variable `name` to the string `value`. */
  export function setenv(name: string, value: string): void;

  /** Delete the environment variable `name`. */
  export function unsetenv(name: string): void;

  /** Return an object containing the environment variables as key-value pairs. */
  export function getenviron(): { [key: string]: string | undefined };

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

declare module "quickjs:os" {
  /**
   * Open a file handle. Returns a number; the file descriptor.
   *
   * @param filename - The path to the file to open.
   * @param flags - Numeric flags that set the mode to use when opening the file. See `os.O_*`
   * @param mode - Octal access mask. Defaults to 0o666.
   */
  export function open(filename: string, flags: number, mode?: number): number;

  /** POSIX open flag, used in {@link open}. */
  export var O_RDONLY: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_WRONLY: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_RDWR: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_APPEND: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_CREAT: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_EXCL: number;

  /** POSIX open flag, used in {@link open}. */
  export var O_TRUNC: number;

  /**
   * Windows-specific open flag: open the file in binary mode (which is the default). Used in {@link open}.
   *
   * NOTE: this property is only present on windows
   */
  export var O_BINARY: number | undefined;

  /**
   * Windows-specific open flag: open the file in text mode. The default is binary mode. Used in {@link open}.
   *
   * NOTE: this property is only present on windows
   */
  export var O_TEXT: number | undefined;

  /** Close the file with descriptor `fd`. */
  export function close(fd: number): void;

  interface OsSeek {
    /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
    (fd: number, offset: number, whence: number): number;

    /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
    (fd: number, offset: BigInt, whence: number): BigInt;
  }

  /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
  export var seek: OsSeek;

  /** Read `length` bytes from the file with descriptor `fd` to the ArrayBuffer `buffer` at byte position `offset`. Return the number of read bytes. */
  export function read(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;

  /** Write `length` bytes to the file with descriptor `fd` from the ArrayBuffer `buffer` at byte position `offset`. Return the number of written bytes. */
  export function write(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;

  /** Return `true` if the file opened with descriptor `fd` is a TTY (terminal). */
  export function isatty(fd: number): boolean;

  /** Return the TTY size as `[width, height]` or `null` if not available. */
  export function ttyGetWinSize(fd: number): null | [number, number];

  /** Set the TTY in raw mode. */
  export function ttySetRaw(fd: number): void;

  /** Remove a file. */
  export function remove(filename: string): void;

  /** Rename a file. */
  export function rename(oldname: string, newname: string): void;

  /** Return the canonicalized absolute pathname of `path`. */
  export function realpath(path: string): string;

  /** Return the current working directory. */
  export function getcwd(): string;

  /** Change the current directory. */
  export function chdir(path: string): void;

  /** Create a directory at `path`. */
  export function mkdir(path: string, mode?: number): void;

  export type Stats = {
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blocks: number;
    atime: number;
    mtime: number;
    ctime: number;
  };

  /**
   * Return a stats object with the following fields:
   *
   * - `dev`
   * - `ino`
   * - `mode`
   * - `nlink`
   * - `uid`
   * - `gid`
   * - `rdev`
   * - `size`
   * - `blocks`
   * - `atime`
   * - `mtime`
   * - `ctime`
   *
   * The times are specified in milliseconds since 1970. `lstat()` is the same as `stat()` except that it returns information about the link itself.
   */
  export function stat(path: string): Stats;

  /**
   * Return a stats object with the following fields:
   *
   * - `dev`
   * - `ino`
   * - `mode`
   * - `nlink`
   * - `uid`
   * - `gid`
   * - `rdev`
   * - `size`
   * - `blocks`
   * - `atime`
   * - `mtime`
   * - `ctime`
   *
   * The times are specified in milliseconds since 1970. `lstat()` is the same as `stat()` except that it returns information about the link itself.
   */
  export function lstat(path: string): Stats;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Mask for getting type of file from mode.
   */
  export var S_IFMT: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: named pipe (fifo)
   */
  export var S_IFIFO: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: character special
   */
  export var S_IFCHR: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: directory
   */
  export var S_IFDIR: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: block special
   */
  export var S_IFBLK: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: regular
   */
  export var S_IFREG: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: socket
   *
   * NOTE: this property is not present on windows
   */
  export var S_IFSOCK: number | undefined;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * File type: symbolic link
   *
   * NOTE: this property is not present on windows
   */
  export var S_IFLNK: number | undefined;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Flag: set group id on execution
   *
   * NOTE: this property is not present on windows
   */
  export var S_ISGID: number | undefined;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Flag: set user id on execution
   *
   * NOTE: this property is not present on windows
   */
  export var S_ISUID: number | undefined;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Mask for getting RWX permissions for owner
   */
  export var S_IRWXU: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: read for owner
   */
  export var S_IRUSR: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: write for owner
   */
  export var S_IWUSR: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: execute for owner
   */
  export var S_IXUSR: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Mask for getting RWX permissions for group
   */
  export var S_IRWXG: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: read for group
   */
  export var S_IRGRP: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: write for group
   */
  export var S_IWGRP: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: execute for group
   */
  export var S_IXGRP: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Mask for getting RWX permissions for others
   */
  export var S_IRWXO: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: read for others
   */
  export var S_IROTH: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: write for others
   */
  export var S_IWOTH: number;

  /**
   * Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`.
   *
   * Permission: execute for others
   */
  export var S_IXOTH: number;

  /**
   * Change the access and modification times of the file path.
   *
   * The times are specified in milliseconds since 1970.
   */
  export function utimes(path: string, atime: number, mtime: number): void;

  /** Create a link at `linkpath` containing the string `target`. */
  export function symlink(target: string, linkpath: string): void;

  /** Return the link target. */
  export function readlink(path: string): string;

  /** Return an array of strings containing the filenames of the directory `path`. */
  export function readdir(path: string): Array<string>;

  /** Add a read handler to the file with descriptor `fd`. `func` is called each time there is data pending for `fd`. A single read handler per file handle is supported. Use `func = null` to remove the handler. */
  export function setReadHandler(fd: number, func: null | (() => void)): void;

  /** Add a write handler to the file with descriptor `fd`. `func` is called each time data can be written to `fd`. A single write handler per file handle is supported. Use `func = null` to remove the handler. */
  export function setWriteHandler(fd: number, func: null | (() => void)): void;

  /** Call the function `func` when the signal `signal` happens. Only a single handler per signal number is supported. Use `null` to set the default handler or `undefined` to ignore the signal. Signal handlers can only be defined in the main thread. */
  export function signal(
    signal: number,
    func: null | undefined | (() => void)
  ): void;

  /** POSIX signal number. */
  export var SIGINT: number;

  /** POSIX signal number. */
  export var SIGABRT: number;

  /** POSIX signal number. */
  export var SIGFPE: number;

  /** POSIX signal number. */
  export var SIGILL: number;

  /** POSIX signal number. */
  export var SIGSEGV: number;

  /** POSIX signal number. */
  export var SIGTERM: number;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGQUIT: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGPIPE: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGALRM: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGUSR1: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGUSR2: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGCHLD: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGCONT: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGSTOP: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGTSTP: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGTTIN: number | undefined;

  /** POSIX signal number. NOTE: this signal is not present on windows. */
  export var SIGTTOU: number | undefined;

  /** Send the signal `sig` to the process `pid`. Use `os.SIG*` constants. */
  export function kill(pid: number, sig: number): void;

  export type ExecOptions = {
    /** Boolean (default = true). If true, wait until the process is terminated. In this case, `exec` returns the exit code if positive or the negated signal number if the process was interrupted by a signal. If false, do not block and return the process id of the child. */
    block?: boolean;

    /** Boolean (default = true). If true, the file is searched in the `PATH` environment variable. */
    usePath?: boolean;

    /** String (default = `args[0]`). Set the file to be executed. */
    file?: string;

    /** String. If present, set the working directory of the new process. */
    cwd?: string;

    /** If present, set the file descriptor in the child for stdin. */
    stdin?: number;

    /** If present, set the file descriptor in the child for stdout. */
    stdout?: number;

    /** If present, set the file descriptor in the child for stderr. */
    stderr?: number;

    /** Object. If present, set the process environment from the object key-value pairs. Otherwise use the same environment as the current process. To get the current process's environment variables as on object, use `std.getenviron()`. */
    env?: { [key: string | number]: string | number | boolean };

    /** Integer. If present, the process uid with `setuid`. */
    uid?: number;

    /** Integer. If present, the process gid with `setgid`. */
    gid?: number;
  };

  /** Execute a process with the arguments args, and the provided options (if any). */
  export function exec(args: Array<string>, options?: ExecOptions): number;

  /**
   * `waitpid` Unix system call. Returns the array [ret, status].
   *
   * From man waitpid(2):
   *
   * waitpid(): on success, returns the process ID of the child whose state has changed; if WNOHANG was specified and one or more child(ren) specified by pid exist, but have not yet changed state, then 0 is returned.
   */
  export function waitpid(pid: number, options?: number): [number, number];

  /** Constant for the `options` argument of `waitpid`. */
  export var WNOHANG: number;
  /** Constant for the `options` argument of `waitpid`. */
  export var WUNTRACED: number;

  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WEXITSTATUS(status: number): number;
  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WTERMSIG(status: number): number;
  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WSTOPSIG(status: number): number;

  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WIFEXITED(status: number): boolean;
  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WIFSIGNALED(status: number): boolean;
  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WIFSTOPPED(status: number): boolean;
  /** Function to be used to interpret the 'status' return value of `waitpid`. */
  export function WIFCONTINUED(status: number): boolean;

  /** `dup` Unix system call. */
  export function dup(fd: number): number;

  /** `dup2` Unix system call. */
  export function dup2(oldfd: number, newfd: number): number;

  /** `pipe` Unix system call. Return two handles as `[read_fd, write_fd]`. */
  export function pipe(): null | [number, number];

  /** Sleep for `delay_ms` milliseconds. */
  export function sleep(delay_ms: number): void;

  export type OSTimer = { [Symbol.toStringTag]: "OSTimer" };

  /** Call the function func after delay ms. Return a handle to the timer. */
  export function setTimeout(
    func: (...args: any) => any,
    delay: number
  ): OSTimer;

  /** Cancel a timer. */
  export function clearTimeout(handle: OSTimer): void;

  /** Return a string representing the platform: "linux", "darwin", "win32", "freebsd", or "js" (emscripten). */
  export var platform: "linux" | "darwin" | "win32" | "freebsd" | "js";

  /**
   * Things that can be put into Worker.postMessage.
   *
   * NOTE: This is effectively the same stuff as supported by the structured
   * clone algorithm, but without support for Map/Set (not supported in
   * QuickJS yet).
   */
  export type StructuredClonable =
    | string
    | number
    | boolean
    | null
    | undefined
    | Boolean
    | String
    | Date
    | RegExp
    | ArrayBuffer
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array
    | DataView
    | Array<StructuredClonable>
    | SharedArrayBuffer
    // Map and Set not yet supported
    // | Map<StructuredClonable, StructuredClonable>
    // | Set<StructuredClonable>
    | { [key: string | number]: StructuredClonable };

  export class Worker {
    /**
     * Constructor to create a new thread (worker) with an API close to the
     * `WebWorkers`. `moduleFilename` is a string specifying the module
     * filename which is executed in the newly created thread. As for
     * dynamically imported module, it is relative to the current script or
     * module path. Threads normally don’t share any data and communicate
     * between each other with messages. Nested workers are not supported.
     */
    constructor(moduleFilename: string);

    /**
     * In the created worker, Worker.parent represents the parent worker and is
     * used to send or receive messages.
     */
    static parent: Worker;

    /**
     * Send a message to the corresponding worker. msg is cloned in the
     * destination worker using an algorithm similar to the HTML structured
     * clone algorithm. SharedArrayBuffer are shared between workers.
     *
     * Current limitations: Map and Set are not supported yet.
     */
    postMessage(msg: StructuredClonable): void;

    /**
     * Set a function which is called each time a message is received. The
     * function is called with a single argument. It is an object with a data
     * property containing the received message. The thread is not terminated
     * if there is at least one non null onmessage handler.
     */
    onmessage: null | ((event: { data: StructuredClonable }) => void);
  }

  /** constant for {@link access}(); test for read permission. */
  export var R_OK: number;

  /** constant for {@link access}(); test for write permission. */
  export var W_OK: number;

  /** constant for {@link access}(); test for execute (search) permission. */
  export var X_OK: number;

  /** constant for {@link access}(); test for existence of file. */
  export var F_OK: number;

  /** `access` Unix system call; checks if a file is readable, writable, executable, and/or exists (use {@link R_OK}, {@link W_OK}, {@link X_OK}, and/or {@link F_OK} for `accessMode`). Throws a descriptive error (with errno property) if the requested access is not available; otherwise, returns undefined. */
  export function access(path: string, accessMode: number): void;

  /** gets the path to the executable which is executing this JS code. might be a relative path or symlink. */
  export function execPath(): string;

  /** changes the access permission bits of the file at `path` using the octal number `mode`. */
  export function chmod(path: string, mode: number): void;
}

/**
 * Options for {@link inspect}.
 */
declare interface InspectOptions {
  /** Whether to display non-enumerable properties. Defaults to false. */
  all?: boolean;

  /** Whether to invoke getter functions. Defaults to false. */
  followGetters?: boolean;

  /** Whether to display the indexes of iterable entries. Defaults to false. */
  indexes?: boolean;

  /** Hide object details after 𝑁 recursions. Defaults to Infinity. */
  maxDepth?: number;

  /** If true, don't identify well-known symbols as `@@…`. Defaults to false. */
  noAmp?: boolean;

  /** If true, don't format byte-arrays as hexadecimal. Defaults to false. */
  noHex?: boolean;

  /** If true, don't display function source code. Defaults to false. */
  noSource?: boolean;

  /** Whether to show `__proto__` properties if possible. Defaults to false. */
  proto?: boolean;

  /** Whether to sort properties alphabetically. When false, properties are sorted by creation order. Defaults to false. */
  sort?: boolean;

  /** Options that control whether and how ANSI terminal escape sequences for colours should be added to the output. Defaults to false, meaning no colours. */
  colours?: boolean | 256 | 8 | InspectColours;

  /** Prefix string to use for indentation. Defaults to '\t'. */
  indent?: string;
}

declare interface InspectColours {
  off?: string | number;
  red?: string | number;
  grey?: string | number;
  green?: string | number;
  darkGreen?: string | number;
  punct?: string | number;
  keys?: string | number;
  keyEscape?: string | number;
  typeColour?: string | number;
  primitive?: string | number;
  escape?: string | number;
  date?: string | number;
  hexBorder?: string | number;
  hexValue?: string | number;
  hexOffset?: string | number;
  reference?: string | number;
  srcBorder?: string | number;
  srcRowNum?: string | number;
  srcRowText?: string | number;
  nul?: string | number;
  nulProt?: string | number;
  undef?: string | number;
  noExts?: string | number;
  frozen?: string | number;
  sealed?: string | number;
  regex?: string | number;
  string?: string | number;
  symbol?: string | number;
  symbolFade?: string | number;
  braces?: string | number;
  quotes?: string | number;
  empty?: string | number;
  dot?: string | number;
}

declare interface InspectFunction {
  /**
   * Generate a human-readable representation of a value.
   *
   * @param value - Value to inspect
   * @param options - Additional settings for refining output
   * @returns A string representation of `value`.
   */
  (value: any, options?: InspectOptions): string;

  /**
   * Generate a human-readable representation of a value.
   *
   * @param value - Value to inspect
   * @param key - The value's corresponding member name
   * @param options - Additional settings for refining output
   * @returns A string representation of `value`.
   */
  (value: any, key?: string | symbol, options?: InspectOptions): string;
}

/**
 * Generate a human-readable representation of a value.
 *
 * @param value - Value to inspect
 * @param key - The value's corresponding member name
 * @param options - Additional settings for refining output
 * @returns A string representation of `value`.
 */
declare var inspect: InspectFunction;

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

declare var require: RequireFunction;

declare var setTimeout: typeof import("quickjs:os").setTimeout;
declare var clearTimeout: typeof import("quickjs:os").clearTimeout;

declare type Interval = { [Symbol.toStringTag]: "Interval" };

declare function setInterval(func: (...args: any) => any, ms: number): Interval;
declare function clearInterval(interval: Interval): void;

interface StringConstructor {
  /**
   * A no-op template literal tag.
   *
   * https://github.com/tc39/proposal-string-cooked
   */
  cooked(
    strings: readonly string[] | ArrayLike<string>,
    ...substitutions: any[]
  ): string;

  /**
   * Remove leading minimum indentation from the string.
   * The first line of the string must be empty.
   *
   * https://github.com/tc39/proposal-string-dedent
   */
  dedent: {
    /**
     * Remove leading minimum indentation from the string.
     * The first line of the string must be empty.
     *
     * https://github.com/tc39/proposal-string-dedent
     */
    (input: string): string;

    /**
     * Remove leading minimum indentation from the template literal.
     * The first line of the string must be empty.
     *
     * https://github.com/tc39/proposal-string-dedent
     */
    (
      strings: readonly string[] | ArrayLike<string>,
      ...substitutions: any[]
    ): string;

    /**
     * Wrap another template tag function such that tagged literals
     * become dedented before being passed to the wrapped function.
     *
     * https://www.npmjs.com/package/string-dedent#usage
     */
    <
      Func extends (
        strings: readonly string[] | ArrayLike<string>,
        ...substitutions: any[]
      ) => string
    >(
      input: Func
    ): Func;
  };
}
