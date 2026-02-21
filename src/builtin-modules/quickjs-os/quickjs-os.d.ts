// Definitions for the quickjs:os module

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
  export var O_WRONLY: number;
  export var O_RDWR: number;
  export var O_APPEND: number;
  export var O_CREAT: number;
  export var O_EXCL: number;
  export var O_TRUNC: number;
  export var O_BINARY: number;
  export var O_TEXT: number;

  /** Close the file with descriptor `fd`. */
  export function close(fd: number): void;

  interface OsSeek {
    (fd: number, offset: number, whence: number): number;
    (fd: number, offset: bigint, whence: number): bigint;
  }

  export var seek: OsSeek;

  export function read(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;
  export function write(
    fd: number,
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): number;
  export function isatty(fd: number): boolean;
  export function ttyGetWinSize(fd: number): null | [number, number];
  export function ttySetRaw(fd: number): void;
  export function remove(filename: string): void;
  export function rename(oldname: string, newname: string): void;
  export function realpath(path: string): string;
  export function getcwd(): string;
  export function chdir(path: string): void;
  export function mkdir(path: string, mode?: number): void;
  export function readdir(path: string): Array<string>;

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

  export function stat(path: string): Stats;
  export function lstat(path: string): Stats;

  /* st_mode constants */
  export var S_IFMT: number;
  export var S_IFIFO: number;
  export var S_IFCHR: number;
  export var S_IFDIR: number;
  export var S_IFBLK: number;
  export var S_IFREG: number;
  export var S_IFSOCK: number;
  export var S_IFLNK: number;
  export var S_ISGID: number;
  export var S_ISUID: number;
  export var S_IRWXU: number;
  export var S_IRUSR: number;
  export var S_IWUSR: number;
  export var S_IXUSR: number;
  export var S_IRWXG: number;
  export var S_IRGRP: number;
  export var S_IWGRP: number;
  export var S_IXGRP: number;
  export var S_IRWXO: number;
  export var S_IROTH: number;
  export var S_IWOTH: number;
  export var S_IXOTH: number;

  export function utimes(path: string, atime: number, mtime: number): void;
  export function symlink(target: string, linkpath: string): void;
  export function readlink(path: string): string;
  export function setReadHandler(fd: number, func: null | (() => void)): void;
  export function setWriteHandler(fd: number, func: null | (() => void)): void;

  export function signal(
    signal: number,
    func: null | undefined | (() => void)
  ): void;

  /* Signal constants */
  export var SIGINT: number;
  export var SIGABRT: number;
  export var SIGFPE: number;
  export var SIGILL: number;
  export var SIGSEGV: number;
  export var SIGTERM: number;
  export var SIGQUIT: number;
  export var SIGPIPE: number;
  export var SIGALRM: number;
  export var SIGUSR1: number;
  export var SIGUSR2: number;
  export var SIGCHLD: number;
  export var SIGCONT: number;
  export var SIGSTOP: number;
  export var SIGTSTP: number;
  export var SIGTTIN: number;
  export var SIGTTOU: number;

  export function kill(pid: number, sig: number): void;

  export type ExecOptions = {
    block?: boolean;
    usePath?: boolean;
    file?: string;
    cwd?: string;
    stdin?: number | FILE;
    stdout?: number | FILE;
    stderr?: number | FILE;
    env?: { [key: string | number]: string | number | boolean };
    uid?: number;
    gid?: number;
  };

  export function exec(args: Array<string>, options?: ExecOptions): number;
  export function waitpid(pid: number, options?: number): [number, number];

  export var WNOHANG: number;
  export var WUNTRACED: number;

  export function WEXITSTATUS(status: number): number;
  export function WTERMSIG(status: number): number;
  export function WSTOPSIG(status: number): number;
  export function WIFEXITED(status: number): boolean;
  export function WIFSIGNALED(status: number): boolean;
  export function WIFSTOPPED(status: number): boolean;
  export function WIFCONTINUED(status: number): boolean;

  export function dup(fd: number): number;
  export function dup2(oldfd: number, newfd: number): number;
  export function pipe(): [number, number];
  export function sleep(delay_ms: number): void;

  // keep in sync with quickjs-os.c
  export var platform:
    | "win32"
    | "darwin"
    | "emscripten"
    | "wasm"
    | "freebsd"
    | "linux"
    | "unknown";

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
    | { [key: string | number]: StructuredClonable };

  export class Worker {
    constructor(moduleFilename: string);
    static parent: Worker;
    postMessage(msg: StructuredClonable): void;
    /**
     * Terminate the worker thread. Equivalent to setting `onmessage` to `null`.
     */
    terminate(): void;
    onmessage: null | ((event: { data: StructuredClonable }) => void);
  }

  /**
   * An opaque wrapper around a Win32 HANDLE.
   *
   * Win32Handle objects cannot be created directly from JavaScript code.
   * They are created by native functions like {@link CreateProcess}.
   *
   * On non-Windows platforms, this class exists but no instances will ever
   * be created.
   */
  export class Win32Handle {
    private constructor();
    readonly [Symbol.toStringTag]: "Win32Handle";
  }

  export type CreateProcessOptions = {
    /** The name of the module to be executed (maps to lpApplicationName). */
    moduleName?: string;

    /** Process creation flags (maps to dwCreationFlags). */
    flags?: number;

    /** The working directory of the new process. */
    cwd?: string;

    /** Environment variables for the new process. If not specified, the parent's environment is inherited. Values must be strings. */
    env?: { [key: string]: string };

    /** FILE object or file descriptor number to use for the child's stdin. */
    stdin?: FILE | number;

    /** FILE object or file descriptor number to use for the child's stdout. */
    stdout?: FILE | number;

    /** FILE object or file descriptor number to use for the child's stderr. */
    stderr?: FILE | number;
  };

  export type CreateProcessResult = {
    /** The process ID of the newly created process. */
    pid: number;

    /** A Win32Handle for the process. */
    processHandle: Win32Handle;

    /** The thread ID of the primary thread of the newly created process. */
    tid: number;

    /** A Win32Handle for the primary thread. */
    threadHandle: Win32Handle;
  };

  /**
   * Create a new process using the Win32 `CreateProcessW` API.
   *
   * @param commandLine - The command line to execute.
   * @param options - Optional settings for module name, flags, cwd, env, and stdio redirection.
   * @returns An object with `pid`, `processHandle`, `tid`, and `threadHandle`.
   *
   * NOTE: this function is only present on windows
   */
  export var CreateProcess:
    | undefined
    | ((
        commandLine: string | null,
        options?: CreateProcessOptions
      ) => CreateProcessResult);

  /**
   * Wait for a Win32 handle to be signaled (wrapper for Win32 `WaitForSingleObject`).
   *
   * @param handle - The handle to wait on.
   * @param timeoutMs - Timeout in milliseconds. Defaults to `Infinity` (INFINITE). Pass `Infinity` to wait indefinitely.
   * @returns One of the `WAIT_*` constants.
   *
   * NOTE: this function is only present on windows
   */
  export var WaitForSingleObject:
    | undefined
    | ((handle: Win32Handle, timeoutMs?: number) => number);

  /**
   * Retrieve the exit code of a process (wrapper for Win32 `GetExitCodeProcess`).
   *
   * @param handle - A process handle.
   * @returns The exit code of the process.
   *
   * NOTE: this function is only present on windows
   */
  export var GetExitCodeProcess: undefined | ((handle: Win32Handle) => number);

  /**
   * Terminate a process (wrapper for Win32 `TerminateProcess`).
   *
   * @param handle - A process handle.
   * @param exitCode - The exit code to assign to the process.
   *
   * NOTE: this function is only present on windows
   */
  export var TerminateProcess:
    | undefined
    | ((handle: Win32Handle, exitCode: number) => void);

  /**
   * Close a Win32 handle. The handle will automatically be closed when the
   * Win32Handle object is garbage-collected, but it's safe to close it
   * yourself as well; a handle that has already been closed will not be
   * closed again during garbage collection.
   *
   * @param handle - The handle to close.
   *
   * NOTE: this function is only present on windows
   */
  export var CloseHandle: undefined | ((handle: Win32Handle) => void);

  export type CreatePipeOptions = {
    /** Whether the pipe handles should be inheritable. Defaults to true. */
    inheritHandle?: boolean;
  };

  export type CreatePipeResult = {
    /** The read end of the pipe (a FILE object opened in binary read mode). */
    readEnd: FILE;

    /** The write end of the pipe (a FILE object opened in binary write mode). */
    writeEnd: FILE;
  };

  /**
   * Create an anonymous pipe (wrapper for Win32 `CreatePipe`).
   *
   * Returns FILE objects for both ends of the pipe. The read end is opened in
   * binary read mode ("rb") and the write end in binary write mode ("wb").
   * You can use all standard FILE methods (readAsString, getline, puts, write,
   * read, close, etc.) on the returned objects.
   *
   * @param options - Optional settings. `inheritHandle` defaults to true.
   * @returns An object with `readEnd` and `writeEnd` FILE properties.
   *
   * NOTE: this function is only present on windows
   */
  export var CreatePipe:
    | undefined
    | ((options?: CreatePipeOptions) => CreatePipeResult);

  /* Win32-specific constants */

  /**
   * Win32 wait result constant: the object was signaled.
   *
   * NOTE: this property is only present on windows
   */
  export var WAIT_OBJECT_0: number | undefined;

  /**
   * Win32 wait result constant: the object was an abandoned mutex.
   *
   * NOTE: this property is only present on windows
   */
  export var WAIT_ABANDONED: number | undefined;

  /**
   * Win32 wait result constant: the wait timed out.
   *
   * NOTE: this property is only present on windows
   */
  export var WAIT_TIMEOUT: number | undefined;

  /**
   * Win32 wait result constant: the function call failed.
   *
   * NOTE: this property is only present on windows
   */
  export var WAIT_FAILED: number | undefined;

  /* access() constants */
  export var R_OK: number;
  export var W_OK: number;
  export var X_OK: number;
  export var F_OK: number;

  export function access(path: string, accessMode: number): void;
  export function execPath(): string;
  export function chmod(path: string, mode: number): void;
  export function gethostname(): string;
}
