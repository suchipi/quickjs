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
    (fd: number, offset: BigInt, whence: number): BigInt;
  }

  export var seek: OsSeek;

  export function read(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
  export function write(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
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

  export function signal(signal: number, func: null | undefined | (() => void)): void;

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

  export var platform: "linux" | "darwin" | "win32" | "freebsd" | "js";

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
    onmessage: null | ((event: { data: StructuredClonable }) => void);
  }

  export class Win32Handle {
    private constructor();
    readonly [Symbol.toStringTag]: "Win32Handle";
  }

  /* Win32-specific constants */
  export var WAIT_OBJECT_0: number;
  export var WAIT_ABANDONED: number;
  export var WAIT_TIMEOUT: number;
  export var WAIT_FAILED: number;

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
