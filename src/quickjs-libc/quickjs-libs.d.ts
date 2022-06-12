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
declare var console: {
  /** Same as {@link print}(). */
  log: typeof print;
};

declare module "std" {
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
   * @property backtrace_barrier - Boolean (default = false). If true, error backtraces do not list the stack frames below the evalScript.
   * @returns The result of the evaluation.
   */
  export function evalScript(
    code: string,
    options?: { backtrace_barrier?: boolean }
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
   * @param filename - The relative or absolute path to the file to import. Relative paths are resolved relative to the file calling `importModule`.
   * @returns The result of the evaluation (module namespace object).
   */
  export function importModule(filename: string): any;

  /**
   * Load the file `filename` and return it as a string assuming UTF-8 encoding. Return `null` in case of I/O error.
   *
   * @param filename - The relative or absolute path to the file to load. Relative paths are resolved relative to the process's current working directory.
   */
  export function loadFile(filename: string): string | null;

  /**
   * Open a file (wrapper to the libc `fopen()`).
   * Return the FILE object or `null` in case of I/O error.
   *
   * If `errorObj` is not undefined, set its errno property to the error code
   * or to 0 if no error occured.
   *
   * @param filename - The relative or absolute path to the file to open. Relative paths are resolved relative to the process's current working directory.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @param errorObj - If present, the `errno` property on this object will be set to the error code, or to 0 if no error occured.
   * @returns The opened FILE object or `null` in the case of I/O error.
   */
  export function open(
    filename: string,
    flags: string,
    errorObj?: { errno: number }
  ): FILE | null;

  /**
   * Open a process by creating a pipe (wrapper to the libc `popen()`).
   * Return the FILE object or `null` in case of I/O error.
   *
   * If `errorObj` is not undefined, set its errno property to the error code
   * or to 0 if no error occured.
   *
   * @param command - The command line to execute. Gets passed via `/bin/sh -c`.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @param errorObj - If present, the `errno` property on this object will be set to the error code, or to 0 if no error occured.
   * @returns The opened FILE object or `null` in the case of I/O error.
   */
  export function popen(
    command: string,
    flags: string,
    errorObj?: { errno: number }
  ): FILE | null;

  /**
   * Open a file from a file handle (wrapper to the libc `fdopen()`).
   * Return the FILE object or `null` in case of I/O error.
   *
   * If `errorObj` is not undefined, set its errno property to the error code
   * or to 0 if no error occured.
   *
   * @param fd - The file handle to open.
   * @param flags - A string containing any combination of the characters 'r', 'w', 'a', '+', and/or 'b'.
   * @param errorObj - If present, the `errno` property on this object will be set to the error code, or to 0 if no error occured.
   * @returns The opened FILE object or `null` in the case of I/O error.
   */
  export function fdopen(
    fd: number,
    flags: string,
    errorObj?: { errno: number }
  ): FILE | null;

  /**
   * Open a temporary file.
   * Return the FILE object or `null` in case of I/O error.
   *
   * If `errorObj` is not undefined, set its errno property to the error code
   * or to 0 if no error occured.
   *
   * @param errorObj - If present, the `errno` property on this object will be set to the error code, or to 0 if no error occured.
   * @returns The opened FILE object or `null` in the case of I/O error.
   */
  export function tmpfile(errorObj?: { errno: number }): FILE | null;

  /** Equivalent to `std.out.puts(str)`. */
  export function puts(str: string): void;

  /** Equivalent to `std.out.printf(fmt, ...args)` */
  export function printf(fmt: string, ...args: Array<any>): void;

  /** Equivalent to the libc sprintf(). */
  export function sprintf(fmt: string, ...args: Array<any>): void;

  // This should be "in" but typescript's module stuff doesn't let use do that properly 😭
  // I'll rename it later I guess
  /** Wrapper to the libc file stdin. */
  export var in_: FILE;

  /** Wrapper to the libc file stdout. */
  export var out: FILE;

  /** Wrapper to the libc file stderr. */
  export var err: FILE;

  /** Constant for {@link FILE.seek}. */
  export var SEEK_SET: number;

  /** Constant for {@link FILE.seek}. */
  export var SEEK_CUR: number;

  /** Constant for {@link FILE.seek}. */
  export var SEEK_END: number;

  /** Enumeration object containing the integer value of common errors. */
  export var Error: {
    EINVAL: number;
    EIO: number;
    EACCES: number;
    EEXIST: number;
    ENOSPC: number;
    ENOSYS: number;
    EBUSY: number;
    ENOENT: number;
    EPERM: number;
    EPIPE: number;
  };

  /** Return a string that describes the error `errno`. */
  export function strerror(errno: number): string;

  /** Manually invoke the cycle removal algorithm (garbage collector). The cycle removal algorithm is automatically started when needed, so this function is useful in case of specific memory constraints or for testing. */
  export function gc(): void;

  /** Return the value of the environment variable `name` or `undefined` if it is not defined. */
  export function getenv(name: string): string;

  /** Set the value of the environment variable `name` to the string `value`. */
  export function setenv(name: string, value: string): void;

  /** Delete the environment variable `name`. */
  export function unsetenv(name: string): void;

  /** Return an object containing the environment variables as key-value pairs. */
  export function getenviron(): { [key: string]: string | undefined };

  // prettier-ignore
  type AllHTTPStatusCodes = 100 | 101 | 102 | 103 | 104 | 105 | 106 | 107 | 108 | 109 | 110 | 111 | 112 | 113 | 114 | 115 | 116 | 117 | 118 | 119 | 120 | 121 | 122 | 123 | 124 | 125 | 126 | 127 | 128 | 129 | 130 | 131 | 132 | 133 | 134 | 135 | 136 | 137 | 138 | 139 | 140 | 141 | 142 | 143 | 144 | 145 | 146 | 147 | 148 | 149 | 150 | 151 | 152 | 153 | 154 | 155 | 156 | 157 | 158 | 159 | 160 | 161 | 162 | 163 | 164 | 165 | 166 | 167 | 168 | 169 | 170 | 171 | 172 | 173 | 174 | 175 | 176 | 177 | 178 | 179 | 180 | 181 | 182 | 183 | 184 | 185 | 186 | 187 | 188 | 189 | 190 | 191 | 192 | 193 | 194 | 195 | 196 | 197 | 198 | 199 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209 | 210 | 211 | 212 | 213 | 214 | 215 | 216 | 217 | 218 | 219 | 220 | 221 | 222 | 223 | 224 | 225 | 226 | 227 | 228 | 229 | 230 | 231 | 232 | 233 | 234 | 235 | 236 | 237 | 238 | 239 | 240 | 241 | 242 | 243 | 244 | 245 | 246 | 247 | 248 | 249 | 250 | 251 | 252 | 253 | 254 | 255 | 256 | 257 | 258 | 259 | 260 | 261 | 262 | 263 | 264 | 265 | 266 | 267 | 268 | 269 | 270 | 271 | 272 | 273 | 274 | 275 | 276 | 277 | 278 | 279 | 280 | 281 | 282 | 283 | 284 | 285 | 286 | 287 | 288 | 289 | 290 | 291 | 292 | 293 | 294 | 295 | 296 | 297 | 298 | 299 | 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308 | 309 | 310 | 311 | 312 | 313 | 314 | 315 | 316 | 317 | 318 | 319 | 320 | 321 | 322 | 323 | 324 | 325 | 326 | 327 | 328 | 329 | 330 | 331 | 332 | 333 | 334 | 335 | 336 | 337 | 338 | 339 | 340 | 341 | 342 | 343 | 344 | 345 | 346 | 347 | 348 | 349 | 350 | 351 | 352 | 353 | 354 | 355 | 356 | 357 | 358 | 359 | 360 | 361 | 362 | 363 | 364 | 365 | 366 | 367 | 368 | 369 | 370 | 371 | 372 | 373 | 374 | 375 | 376 | 377 | 378 | 379 | 380 | 381 | 382 | 383 | 384 | 385 | 386 | 387 | 388 | 389 | 390 | 391 | 392 | 393 | 394 | 395 | 396 | 397 | 398 | 399 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 425 | 426 | 427 | 428 | 429 | 430 | 431 | 432 | 433 | 434 | 435 | 436 | 437 | 438 | 439 | 440 | 441 | 442 | 443 | 444 | 445 | 446 | 447 | 448 | 449 | 450 | 451 | 452 | 453 | 454 | 455 | 456 | 457 | 458 | 459 | 460 | 461 | 462 | 463 | 464 | 465 | 466 | 467 | 468 | 469 | 470 | 471 | 472 | 473 | 474 | 475 | 476 | 477 | 478 | 479 | 480 | 481 | 482 | 483 | 484 | 485 | 486 | 487 | 488 | 489 | 490 | 491 | 492 | 493 | 494 | 495 | 496 | 497 | 498 | 499 | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511 | 512 | 513 | 514 | 515 | 516 | 517 | 518 | 519 | 520 | 521 | 522 | 523 | 524 | 525 | 526 | 527 | 528 | 529 | 530 | 531 | 532 | 533 | 534 | 535 | 536 | 537 | 538 | 539 | 540 | 541 | 542 | 543 | 544 | 545 | 546 | 547 | 548 | 549 | 550 | 551 | 552 | 553 | 554 | 555 | 556 | 557 | 558 | 559 | 560 | 561 | 562 | 563 | 564 | 565 | 566 | 567 | 568 | 569 | 570 | 571 | 572 | 573 | 574 | 575 | 576 | 577 | 578 | 579 | 580 | 581 | 582 | 583 | 584 | 585 | 586 | 587 | 588 | 589 | 590 | 591 | 592 | 593 | 594 | 595 | 596 | 597 | 598 | 599;

  // prettier-ignore
  type GoodHTTPStatusCodes = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209 | 210 | 211 | 212 | 213 | 214 | 215 | 216 | 217 | 218 | 219 | 220 | 221 | 222 | 223 | 224 | 225 | 226 | 227 | 228 | 229 | 230 | 231 | 232 | 233 | 234 | 235 | 236 | 237 | 238 | 239 | 240 | 241 | 242 | 243 | 244 | 245 | 246 | 247 | 248 | 249 | 250 | 251 | 252 | 253 | 254 | 255 | 256 | 257 | 258 | 259 | 260 | 261 | 262 | 263 | 264 | 265 | 266 | 267 | 268 | 269 | 270 | 271 | 272 | 273 | 274 | 275 | 276 | 277 | 278 | 279 | 280 | 281 | 282 | 283 | 284 | 285 | 286 | 287 | 288 | 289 | 290 | 291 | 292 | 293 | 294 | 295 | 296 | 297 | 298 | 299;

  type BadHTTPStatusCodes = Exclude<AllHTTPStatusCodes, GoodHTTPStatusCodes>;

  interface UrlGet {
    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and null otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string): string | null;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and null otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: false }): string | null;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and null otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { full: false }): string | null;

    /**
     * Download `url` using the `curl` command line utility. Returns string
     * when the http status code is between 200 and 299, and null otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: false; full: false }): string | null;

    /**
     * Download `url` using the `curl` command line utility. Returns
     * ArrayBuffer when the http status code is between 200 and 299, and null
     * otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: true }): ArrayBuffer | null;

    /**
     * Download `url` using the `curl` command line utility. Returns
     * ArrayBuffer when the http status code is between 200 and 299, and null
     * otherwise.
     *
     * Pass an object with { full: true } as the second argument to get
     * response headers and status code.
     */
    (url: string, options: { binary: true; full: false }): ArrayBuffer | null;

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string or null)
     * - `responseHeaders`: headers separated by CRLF
     * - `status`: status code
     *
     * `response` is `null` in case of protocol or network error.
     */
    (url: string, options: { full: true }):
      | {
          status: GoodHTTPStatusCodes;
          response: string;
          responseHeaders: string;
        }
      | {
          status: BadHTTPStatusCodes;
          response: null;
          responseHeaders: string;
        };

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string or null)
     * - `responseHeaders`: headers separated by CRLF
     * - `status`: status code
     *
     * `response` is `null` in case of protocol or network error.
     */
    (url: string, options: { full: true; binary: false }):
      | {
          status: GoodHTTPStatusCodes;
          response: string;
          responseHeaders: string;
        }
      | {
          status: BadHTTPStatusCodes;
          response: null;
          responseHeaders: string;
        };

    /**
     * Download `url` using the `curl` command line utility.
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (ArrayBuffer or null)
     * - `responseHeaders`: headers separated by CRLF
     * - `status`: status code
     *
     * `response` is `null` in case of protocol or network error.
     */
    (url: string, options: { full: true; binary: true }):
      | {
          status: GoodHTTPStatusCodes;
          response: ArrayBuffer;
          responseHeaders: string;
        }
      | {
          status: BadHTTPStatusCodes;
          response: null;
          responseHeaders: string;
        };
  }

  /**
   * Download `url` using the `curl` command line utility. `options` is an optional object containing the following optional properties:
   *
   *
   * binary
   *
   *   Boolean (default = false). If true, the response is an ArrayBuffer instead of a string. When a string is returned, the data is assumed to be UTF-8 encoded.
   *
   * full
   *
   *   Boolean (default = false). If true, return the an object contains the properties response (response content), responseHeaders (headers separated by CRLF), status (status code). response is null is case of protocol or network error. If full is false, only the response is returned if the status is between 200 and 299. Otherwise null is returned.
   */
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

  /** An object representing a file handle. */
  export class FILE {
    /** Close the file. Return 0 if OK or -errno in case of I/O error.  */
    close(): number;

    /** Outputs the string with the UTF-8 encoding. */
    puts(str: string): void;

    /**
     * Formatted printf.
     *
     * The same formats as the standard C library `printf` are supported. Integer format types (e.g. `%d`) truncate the Numbers or BigInts to 32 bits. Use the `l` modifier (e.g. `%ld`) to truncate to 64 bits.
     */
    printf(fmt: string, ...args: Array<any>): void;

    /** Flush the buffered file. */
    flush(): void;

    /**
     * Seek to a given file position (whence is `std.SEEK_*`).
     *
     * `offset` can be a number or a bigint. Return 0 if OK or `-errno` in case of I/O error.
     */
    seek(
      offset: number,
      whence: typeof SEEK_SET | typeof SEEK_CUR | typeof SEEK_END
    ): number;

    /** Return the current file position. */
    tell(): number;

    /** Return the current file position as a bigint. */
    tello(): BigInt;

    /** Return true if end of file. */
    eof(): boolean;

    /** Return the associated OS handle. */
    fileno(): number;

    /** Return true if there was an error. */
    error(): boolean;

    /** Clear the error indication. */
    clearerr(): void;

    /** Read `length` bytes from the file to the ArrayBuffer `buffer` at byte position `position` (wrapper to the libc `fread`). */
    read(buffer: ArrayBuffer, position: number, length: number): void;

    /** Write `length` bytes from the file to the ArrayBuffer `buffer` at byte position `position` (wrapper to the libc `fwrite`). */
    write(buffer: ArrayBuffer, position: number, length: number): void;

    /** Return the next line from the file, assuming UTF-8 encoding, excluding the trailing line feed. */
    getline(): string;

    /** Read `maxSize` bytes from the file and return them as a string assuming UTF-8 encoding. If `maxSize` is not present, the file is read up its end. */
    readAsString(maxSize?: number): string;

    /** Return the next byte from the file. Return -1 if the end of file is reached. */
    getByte(): number;

    /** Write one byte to the file. */
    putByte(value: number): void;
  }
}

declare module "os" {
  /**
   * Open a file handle. Returns a number; if positive, it's a valid file
   * handle. If negative, it's an OS-specific error code.
   *
   * @param filename - The path to the file to open.
   * @param flags - Numeric flags that set the mode to use when opening the file. See `os.O_*`
   * @param mode - Octal access mask for a new file. Defaults to 0o666.
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

  /** Windows-specific open flag: open the file in text mode. The default is binary mode. Used in {@link open}. */
  export var O_TEXT: number;

  /** Close the file handle `fd`. */
  export function close(fd: number): void;

  interface OsSeek {
    /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
    (fd: number, offset: number, whence: number): number;

    /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
    (fd: number, offset: BigInt, whence: number): BigInt;
  }

  /** Seek in the file. Use `std.SEEK_*` for `whence`. `offset` is either a number or a bigint. If `offset` is a bigint, a bigint is returned too. */
  export var seek: OsSeek;

  /** Read `length` bytes from the file handle `fd` to the ArrayBuffer `buffer` at byte position `offset`. Return the number of read bytes or < 0 if error. */
  export function read(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;

  /** Write `length` bytes to the file handle `fd` from the ArrayBuffer `buffer` at byte position `offset`. Return the number of written bytes or < 0 if error. */
  export function write(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;

  /** Return `true` if `fd` is a TTY (terminal) handle. */
  export function isatty(fd: number): boolean;

  /** Return the TTY size as `[width, height]` or `null` if not available. */
  export function ttyGetWinSize(fd: number): null | [number, number];

  /** Set the TTY in raw mode. */
  export function ttySetRaw(fd: number): void;

  /** Remove a file. Return 0 if OK or -errno. */
  export function remove(filename: string): number;

  /** Rename a file. Return 0 if OK or -errno. */
  export function rename(oldname: string, newname: string): number;

  /** Return `[str, err]` where `str` is the canonicalized absolute pathname of `path` and `err` the error code. */
  export function realpath(path: string): [string, number];

  /** Return `[str, err]` where `str` is the current working directory and `err` the error code. */
  export function getcwd(): [string, number];

  /** Change the current directory. Return 0 if OK or `-errno`. */
  export function chdir(path: string): number;

  /** Create a directory at `path`. Return 0 if OK or `-errno`. */
  export function mkdir(path: string, mode?: number): number;

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
   * Return `[obj, err]` where `obj` is an object containing the file status of `path`. `err` is the error code.
   *
   * The following fields are defined in obj:
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
  export function stat(path: string): [Stats, number];

  /**
   * Return `[obj, err]` where `obj` is an object containing the file status of `path`. `err` is the error code.
   *
   * The following fields are defined in obj:
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
  export function lstat(path: string): [Stats, number];

  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFMT: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFIFO: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFCHR: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFDIR: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFBLK: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFREG: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFSOCK: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_IFLNK: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_ISGID: number;
  /** Constant to interpret the `mode` property returned by `stat()`. Has the same value as in the C system header `sys/stat.h`. */
  export var S_ISUID: number;

  /**
   * Change the access and modification times of the file path.
   *
   * The times are specified in milliseconds since 1970.
   *
   * Return 0 if OK or `-errno`.
   */
  export function utimes(path: string, atime: number, mtime: number): number;

  /** Create a link at `linkpath` containing the string `target`. Return 0 if OK or `-errno`. */
  export function symlink(target: string, linkpath: string): number;

  /** Return `[str, err]` where `str` is the link target and `err` the error code. */
  export function readlink(path: string): [string, number];

  /** Return `[array, err]` where `array` is an array of strings containing the filenames of the directory `path`. `err` is the error code. */
  export function readdir(path: string): [Array<string>, number];

  /** Add a read handler to the file handle `fd`. `func` is called each time there is data pending for `fd`. A single read handler per file handle is supported. Use `func = null` to remove the handler. */
  export function setReadHandler(fd: number, func: null | (() => void)): void;

  /** Add a write handler to the file handle `fd`. `func` is called each time data can be written to `fd`. A single write handler per file handle is supported. Use `func = null` to remove the handler. */
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

    /** If present, set the handle in the child for stdin. */
    stdin?: number;

    /** If present, set the handle in the child for stdout. */
    stdout?: number;

    /** If present, set the handle in the child for stderr. */
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
   * `waitpid` Unix system call. Returns the array [ret, status]. ret contains -errno in case of error.
   *
   * From man waitpid(2):
   *
   * waitpid(): on success, returns the process ID of the child whose state has changed; if WNOHANG was specified and one or more child(ren) specified by pid exist, but have not yet changed state, then 0 is returned. On error, -1 is returned.
   */
  export function waitpid(pid: number, options?: number): [number, number];

  /** Constant for the `options` argument of `waitpid`. */
  export var WNOHANG: number;

  /** `dup` Unix system call. */
  export function dup(fd: number): number;

  /** `dup2` Unix system call. */
  export function dup2(oldfd: number, newfd: number): number;

  /** `pipe` Unix system call. Return two handles as `[read_fd, write_fd]` or `null` in case of error. */
  export function pipe(): null | [number, number];

  /** Sleep for `delay_ms` milliseconds. */
  export function sleep(delay_ms: number): void;

  export type Timer = number & { __is: "Timer" };

  /** Call the function func after delay ms. Return a handle to the timer. */
  export function setTimeout(func: () => void, delay: number): Timer;

  /** Cancel a timer. */
  export function clearTimeout(handle: Timer): void;

  /** Return a string representing the platform: "linux", "darwin", "win32" or "js". */
  export var platform: "linux" | "darwin" | "win32" | "js";

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
}
