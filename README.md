# suchipi/quickjs

Fork of the fantastic QuickJS engine by Fabrice Bellard, with many changes.

## High-level List of Most Notable Changes

- APIs from the 'std' and 'os' modules were changed to be more idiomatic-to-JS; notably, they throw Errors on failure instead of returning null or errno numbers.
- APIs from the 'std' and 'os' modules that were implemented on UNIX platforms but weren't implemented on Windows (exec, readlink, symlink, etc) now are.
- TypeScript-format type interface files (`.d.ts` files) were added for everything.
  - There's also markdown generated from these available [here](/meta/docs)
- Hooks have been added to the module loader that make its functionality more customizable.
- Some ES2022 features were added, and some non-standard ECMAScript proposals and extensions were added.
- The way the project is organized and built was changed dramatically.
- `quickjs-libc.c` was split into separate files: `quickjs-std.c`, `quickjs-os.c`, `quickjs-timers.c`, `quickjs-cmdline.c`, and `quickjs-eventloop.c`
- Several new JS bindings for C APIs have been added, such as `strftime`, `access`, `fsync`, `setvbuf`, `getuid`...
- WHATWG TextEncoder/TextDecoder added with support for common encodings and non-standard support for encoding to encodings other than UTF-8
- Some C source file locations now appear in JS error stack traces, making it easier to debug errors originating from C code
- Scripts were added that cross-compile binaries for several operating systems and architectures
- FreeBSD support added

## Detailed List of Changes

### Changes to `quickjs`:

- A TypeScript `.d.ts` file is provided for all QuickJS-specific APIs (operator overloading APIs, BigInt extensions, BigFloat, BigDecimal, etc).
- Added support for Error constructor "cause" option (from ES2022).
- Added support for relative indexing method `.at()` (from ES2022).
- `String.cooked` added (no-op template tag, like the proposed [String.cooked](https://github.com/tc39/proposal-string-cooked)).
- Added function `JS_EvalThis_Privileged`, which allows C code to run eval in Contexts that have eval disabled. With this, you can disable eval in a context for security purposes, but can still execute trusted code within it.
- Additional functions are exposed that allow importing modules synchronously or asynchronously:
  - `JS_DynamicImportAsync`
  - `JS_DynamicImportSync`
  - `JS_DynamicImportSync2` (additional arg for specifying basename that the import specifier is relative to)
- Error-throwing functions (`JS_ThrowError`, `JS_ThrowSyntaxError`, `JS_ThrowTypeError`, `JS_ThrowReferenceError`, `JS_ThrowRangeError`, `JS_ThrowInternalError`) now accept `filename` and `line_num` parameters, so that C source locations can appear in JS error stack traces.
- Additional error-related functions added:
  - `JS_ThrowError`
  - `JS_AddPropertyToException`
- Additional utility functions added:
  - `JS_FreezeObjectValue` (performs Object.freeze)
  - `JS_IsPrimitive`
  - `JS_PushSyntheticStackFrame`/`JS_PopSyntheticStackFrame`
    - These are for creating JS error stack frames from the C side, to help with debugging
- ModuleDefs now have an optional "user_data" property (pointer to void) which can be accessed during module initialization (via `JS_GetModuleUserData` and `JS_SetModuleUserData`)
- Added `JS_SetContextOpaqueValue` and `JS_GetContextOpaqueValue`, which let you associate a JSValue with a JSContext, which will be garbage-collected when that JSContext is garbage-collected.
- Added `JS_SetRuntimeOpaqueValue` and `JS_GetRuntimeOpaqueValue`, which let you associate a JSValue with a JSRuntime (similar to the Context versions above).
- Non-standard `Object.toPrimitive` added (static method that invokes ToPrimitive on the given value, using the optionally-provided hint).
- Non-standard `Object.isPrimitive` added (static method that returns a boolean indicating whether the given value is a primitive).
- Non-standard `Symbol.typeofValue` has been added which can be used to override the result of using the `typeof` operator on an object. However, you can only use it to return a different one of the builtin values `typeof` would normally return: `"object"`, `"boolean"`, `"number"`, etc.

### Changes to `quickjs-libc`:

- quickjs-libc.c was split apart into quickjs-std.c, quickjs-os.c, quickjs-timers.c, quickjs-cmdline.c, and quickjs-eventloop.c
- `std` and `os` builtin modules are now namespaced under "quickjs:". In other words, you have to import them as "quickjs:std" and "quickjs:os".
- APIs in `std` and `os` no longer return errno anywhere; instead, Error objects are thrown. `errno` is available as a property on the thrown Error objects.
- In places where APIs in `std` or `os` would return null on failure, now an error will be thrown instead.
- Error messages from `std` and `os` include information in the message such as the path to the file that couldn't be loaded. This info is also available as properties on the Error object.
- A TypeScript `.d.ts` file is now provided for all APIs (globals as well as stuff from `std`/`os`).
- A builtin global function `inspect` is added, which pretty-prints any JS value as a string. Objects can customize their `inspect` output by defining a method keyed with the `inspect.custom` symbol.
- `os.access` function added (wrapper for libc `access`).
- `FILE.prototype.sync` method added (wrapper for `fsync`).
- `FILE.prototype.setvbuf` method added (wrapper for `setvbuf`).
- `FILE.prototype.writeTo` method added (pipe data from one FILE to another, given a buffer size and limit).
- `FILE.prototype.target` property added (human-readable description of where a FILE points, for debugging).
- `std.isFILE` function added (returns whether the provided object is a `FILE` (via `js_std_file_class_id`)).
- `os.{WUNTRACED,WEXITSTATUS,WTERMSIG,WSTOPSIG,WIFEXITED,WIFSIGNALED,WIFSTOPPED,WIFCONTINUED}` added, for working with `os.waitpid`.
- `os.{S_IRWXU,S_IRUSR,S_IWUSR,S_IXUSR,S_IRWXG,S_IRGRP,S_IWGRP,S_IXGRP,S_IRWXO,S_IROTH,S_IWOTH,S_IXOTH}` added, for working with file modes.
- `"b"` mode flag is now allowed in `std.fdopen`.
- `std.strftime` added (wrapper for libc `strftime`).
- Added `std.getuid`, `std.geteuid`, `std.getgid`, `std.getegid`, and `std.getpwuid` (wrappers for the libc/posix functions of the same names).
- `os.gethostname` added (wrapper for POSIX `gethostname`).
- `os.execPath` added (returns the path to the executable running the JS code).
- `os.chmod` added (wrapper for POSIX `chmod`).
- The following functions from `os` which previously weren't implemented on Windows now are: `exec`, `kill`, `dup`, `dup2`, `waitpid`, `readlink`, `lstat`, and `symlink`.
  - These use shims in some places to emulate POSIX functionality on Windows. if those shims aren't sufficiently accurate, you can instead use the additional windows-specific APIs which have been added to `os`:
  - CreateProcess
  - WaitForSingleObject
  - GetExitCodeProcess
  - TerminateProcess
  - CloseHandle
  - CreatePipe
  - WAIT_OBJECT_0, WAIT_ABANDONED, WAIT_TIMEOUT, WAIT_FAILED (wait result constants)
- Most module-loading-related code was moved into `quickjs-modulesys`.
- `setTimeout` and `clearTimeout` are now available as globals (previously they were only available as exports).
- `setInterval` and `clearInterval` are added, available as globals.
- Several C-side helper functions were moved out of quickjs-libc and into quickjs-utils.
- Most module-related code (setting import.meta, etc) was moved into quickjs-modulesys.
- The manual garbage collection function `std.gc()` was moved to `"quickjs:engine"`.

### Changes to the `qjs` binary:

- Blocking the main thread is allowed
- `-m` (module mode) now affects eval strings passed to `-e`
- Changes to the repl:
  - Ctrl+W deletes words backwards from the cursor position
  - The last error is accessible via the `_error` global
  - If a thrown error has additional properties added onto it, those are printed along with the thrown error
  - The new `inspect` global is used to print results

### New binary: `qjsbootstrap`:

Appending some JS code to the end of this binary changes it into a binary that executes that JS code:

```sh
$ cp qjsbootstrap my-program
$ echo 'console.log("hello!")' >> my-program
$ ./my-program
hello!
```

You can use this to create distributable binaries that run JS code without needing to use qjsc or a C compiler. Instructions [here](https://github.com/suchipi/quickjs/tree/main/src/programs/qjsbootstrap).

> Note: On FreeBSD, `qjsbootstrap` requires procfs. You can mount it with `mount -t procfs proc /proc`. I started some work to use libprocstat instead, but haven't completed it yet.

### New binary: `quickjs-run`:

Barebones binary for running files, without any of the arg parsing logic from qjs. Good for testing some unusual cases, or writing programs with custom argv parsing logic.

### New module: "quickjs:cmdline"

- Exports a reference to scriptArgs (also available as a global) as well as `getExitCode`, `setExitCode`, and `exit` (exit was formerly in std).
- `exit`'s parameter is now optional. The value passed to `setExitCode` will be used when the process exits normally, or when `exit` is called without any arguments. `setExitCode`, `getExitCode`, and `exit` throw if called from a thread other than the main thread (ie. a Worker).

### New module: "quickjs:bytecode"

A Module that exposes QuickJS's value <-> bytecode (de)serialization APIs to JavaScript code. Generated bytecode can be combined with `qjsbootstrap-bytecode` in the same way that source code strings can be combined with `qjsbootstrap`.

Exports:

- `fromFile(path, options?)` - Convert the module or script in the specified file into bytecode
- `fromValue(value, options?)` - Convert the provided value into bytecode
- `toValue(bytecode)` - Convert the provided bytecode into a value

### New module: "quickjs:context"

A Module that allows JS code to create new JS Contexts (Realms). You can create new Contexts and run code inside them. Contexts can have certain features disabled (like eval) for security purposes. You can share values between Contexts. Contexts are destroyed when they get garbage-collected.

The `Context` class constructor accepts an options object to enable/disable specific features: `date`, `eval`, `stringNormalize`, `regExp`, `json`, `proxy`, `mapSet`, `typedArrays`, `promise`, `bigint`, `bigfloat`, `bigdecimal`, `operators`, `useMath`, `inspect`, `console`, `print`, `moduleGlobals`, `timers`, and a `modules` object to enable/disable specific builtin modules (`quickjs:bytecode`, `quickjs:cmdline`, `quickjs:context`, `quickjs:encoding`, `quickjs:engine`, `quickjs:os`, `quickjs:std`, `quickjs:timers`).

### New module: "quickjs:encoding"

Implementation of the [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/), with non-standard extensions to allow encoding to non-utf8 encodings. This module also exports two small, simple functions for converting between utf-8 and ArrayBuffer (`toUtf8` and `fromUtf8`).

Supported Encodings, (for both TextDecoder and TextEncoder):

- utf-8
- utf-16le
- utf-16be
- shift_jis
- windows-1252
- windows-1251
- big5
- euc-kr
- euc-jp
- gb18030

### New library: `quickjs-utils`

Helper structs, functions, and macros that make it easier to work with QuickJS in C code.

- APIs for looping over every property in a JSValue
- Helper function for loading a file from disk into char a buffer
- Helper functions for printing JS errors to stderr

### New module: "quickjs:engine"

This module contains APIs related to engine internals like script execution, module loading, code eval, filename reflection, and garbage collection. Several parts of quickjs-libc were moved here so that quickjs-libc could be focused on "C standard library" bindings.

### New module: "quickjs:timers"

Timer functions extracted from quickjs-libc into their own module. Exports `setTimeout` and `clearTimeout` as well as the newly-added `setInterval` and `clearInterval`. These are also available as globals.

### Changes to the module loader

- `.js` extensions can now be omitted from import specifiers; they're optional.
- If your import specifier points to a folder, it will attempt to load `index.js` from that folder.
- Synchronous import function added (`importModule`), which provides the same module record object you would get via dynamic (async) import.
- JS api for using the engine's configured module name normalization function was added (`resolveModule`).
- Adds the global `require`, a CommonJS-like synchronous module loading function.
  - The `require` function is not fully CommonJS-compliant; for instance, `require.main` is not present. `require.resolve` is, though.
- Adds `import.meta.require`
  - It's the same as the global `require`; it's just added to import.meta for compatibility with bundlers that output `import.meta.require`, like `bun`.
- Adds `import.meta.resolve`
  - Similar to [the one in the browser](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve#specifications), but it's actually just `require.resolve` exposed via `import.meta`.
- Module and eval helpers have been moved from "quickjs:std" to the new module "quickjs:engine".
- Makes the module loader's resolution and loading behavior configurable
  - The module "quickjs:engine" exports an object called `ModuleDelegate`.
  - You can specify additional implicit import specifier extensions by adding to the `ModuleDelegate.searchExtensions` array.
  - You can transform any file prior to evaluating it as a module by adding a function to the `ModuleDelegate.compilers` object. Useful for compile-to-js languages like TypeScript, Coffeescript, etc.
  - You can override module name normalization (aka module resolution) by replacing the `ModuleDelegate.resolve` function.
    - Note that you must handle `ModuleDelegate.searchExtensions` yourself in your replacement implementation.
  - You can override the method used to load modules by replacing the `ModuleDelegate.read` function.
    - Note that you must handle `ModuleDelegate.compilers` yourself in your replacement implementation.
- Makes `import.meta.main` configurable
  - The module "quickjs:engine" exports two functions named `setMainModule` and `isMainModule`.
  - You can use `setMainModule` to make `import.meta.main` true within that module's code. Note, however, that it does not work retroactively; only modules loaded after the `setMainModule` call will be affected. To defer module load, use `import()`, `importModule` from "quickjs:engine", or `require`.
  - You can use `isMainModule` to check if a given module would be the main module without loading it.
- New `isModuleNamespace` function lets users identify module namespace objects
- New `defineBuiltinModule` function lets users add their own builtin modules
- When using `require` to load a module which contains an export named `__cjsExports`, the value of the `__cjsExports` property will be returned from `require` instead of the usual module namespace object. This can be leveraged by users configuring the module loader to add some CommonJS <-> ESM interop. Note, however, that dynamic import and `"quickjs:engine"`'s `importModule` always receive the usual module namespace object.

### Changes to project organization

- Stuff is reorganized into separate folders under `src`.
- Ninja is used instead of make. Ninja build config is generated via `.ninja.js` files which get loaded into [@suchipi/shinobi](https://github.com/suchipi/shinobi).
- Line endings have been made consistent and trailing whitespace has been removed
- The tests are authored in a new format which leverages jest snapshot testing.
- Some parts of `quickjs-libc` were moved into `quickjs-modulesys` and `quickjs-engine`.
- The `eval_*` functions that were duplicated in each of the programs (`eval_buf`, `eval_file`, and `eval_binary`) were deduplicated and moved into `quickjs-modulesys`.

### More target OSes/runtimes

We now include support for more platforms, and cross-compilation scripts to build most of those platforms from any platform where Docker is available.

See the `meta/ninja/envs` folder to see all the supported platforms. The `host` folder represents the machine where compilation is taking place, and the `target` folder represents the target platform for the output binaries.

### Library Archives

We create `.a` files containing all of quickjs as part of the build.

## API Documentation

Documentation for all extensions and builtin modules can be read [here](/meta/docs).

## Compiling

The repo has stuff set up to compile quickjs binaries for:

- Linux (amd64 and aarch64)
  - glibc
  - musl
  - statically-linked
- macOS/iOS (x86_64 and arm64)
- Windows (x86_64)
- FreeBSD (cross-compilation not supported; you need to compile from a FreeBSD host)
- WebAssembly (WASI Preview 2, via [wasi-sdk](https://github.com/WebAssembly/wasi-sdk)).
  - Run the resulting `.wasm` files with [wasmtime](https://wasmtime.dev/) or any WASI P2-compatible runtime.
  - Functions which are not possible to implement in WASI P2 (like os.exec) will throw an error when called.
- WebAssembly (Emscripten, via [emscripten](https://emscripten.org/)).
  - Produces `.js` + `.wasm` file pairs that can be run with Node.js or loaded in a browser.
  - Build via Docker: `meta/docker/run-build.sh wasm32-emscripten`
  - Or set `TARGET=emscripten` with `emcc`/`emar` on your PATH.
- Cosmopolitan Libc (cross-platform `*.com` binaries). You need the cosmo toolchain installed for this one to work.
- any arbitrary unix-like OS, if you set env vars for CC, CFLAGS, etc.

QuickJS itself has no external dependencies outside this repo except pthreads, and all of the code is C11. As such, it shouldn't be too difficult to get it compiling on other Unix-like OSes.

Linux, macOS, iOS, and Windows binaries can be compiled using Docker. Or, you can compile binaries for just your own unix system, without using Docker.

If you're not gonna use Docker, you'll need to install [Ninja](https://ninja-build.org/) and [Node.js](https://nodejs.org/) in order to compile. I use Ninja 1.10.1 and Node.js 18.18.0, but it should work with most versions of both of those.

### Compilation Instructions

To compile binaries for Linux, macOS, iOS, and Windows (using Docker):

- Make sure you have docker installed.
- Clone the repo and cd to its folder
- Run `meta/docker/build-all.sh`
- Build artifacts will be placed in the `build` folder, organized by OS.

Or, to compile binaries for just your own unix system:

- Make sure you have both [Ninja](https://ninja-build.org/) and [Node.js](https://nodejs.org/) installed. I use Ninja 1.10.1 and Node.js 18.18.0, but it should work with most versions of both of those.
- Make sure you have [bash](https://www.gnu.org/software/bash/) 4 or higher.

  > Almost all modern Linux systems have bash 5, but macOS still has bash 3. To get a newer version of bash on macOS, install either [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (your preference), then run `brew install bash` or `sudo port install bash`, respectively. You may also need to ensure your shell's [PATH environment variable](https://superuser.com/a/284351) is set correctly; running `which bash` should print the location of the _newer_ bash binary, installed by Homebrew/MacPorts.

- Clone the repo and cd to its folder
- Run `meta/build.sh`
- Build artifacts will be placed in the `build` folder. You're probably most interested in stuff in the `build/bin` and `build/lib` folders.

If you are targeting an unsupported OS or would like to use a different compiler, set the environment variables `HOST` and `TARGET` both to "other", and then set the environment variables `CC`, `AR`, `CFLAGS`, and `LDFLAGS` as you see fit. There are some other variables you can set as well; see `meta/ninja/envs/target/other.ninja.js` and `meta/ninja/envs/host/other.ninja.js` for a list.
