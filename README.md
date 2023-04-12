# suchipi/quickjs

Fork of the fantastic QuickJS engine by Fabrice Bellard, with the following changes:

## Changes to `quickjs`:

- A TypeScript `.d.ts` file is provided for all QuickJS-specific APIs (operator overloading APIs, BigInt extensions, BigFloat, BigDecimal, etc).
- `Object.toPrimitive` is now available (static method that invokes ToPrimitive on the given value, using the optionally-provided hint).
- `Object.isPrimitive` is now available (static method that returns a boolean indicating whether the given value is a primitive).
- `Symbol.typeofValue` can be used to override the result of using the `typeof` operator on an object. However, you can only use it to return a different one of the builtin values `typeof` would normally return: `"object"`, `"boolean"`, `"number"`, etc.
- Added support for Error constructor "cause" option (from ES2022).
- Added support for relative indexing method `.at()` (from ES2022).
- Added function `JS_EvalThis_Privileged`, which allows C code to run eval in Contexts that have eval disabled. With this, you can disable eval in a context for security purposes, but can still execute trusted code within it.
- Additional functions are exposed that allow importing modules synchronously or asynchronously:
  - `JS_DynamicImportAsync`
  - `JS_DynamicImportSync`
  - `JS_DynamicImportSync2` (additional arg for specifying basename that the import specifier is relative to)
- Additional error-related functions added:
  - `JS_ThrowError`
  - `JS_AddPropertyToException`
- Additional utility functions added:
  - `JS_FreezeObjectValue` (performs Object.freeze)
  - `JS_IsPrimitive`
- ModuleDefs now have an optional "user_data" property (pointer to void) which can be accessed during module initialization (via `JS_GetModuleUserData` and `JS_SetModuleUserData`)

## Changes to `quickjs-libc`:

- `std` and `os` builtin modules are now namespaced under "quickjs:". In other words, you have to import them as "quickjs:std" and "quickjs:os".
- APIs in `std` and `os` no longer return errno anywhere; instead, Error objects are thrown. `errno` is available as a property on the thrown Error objects.
- In places where APIs in `std` or `os` would return null on failure, now an error will be thrown instead.
- Error messages from `std` and `os` include information in the message such as the path to the file that couldn't be loaded. This info is also available as properties on the Error object.
- `.js` extensions can now be omitted from import specifiers; they're optional.
- If your import specifier points to a folder, it will attempt to load `index.js` from that folder.

## Additions to `quickjs-libc`:

- A TypeScript `.d.ts` file is provided for all APIs (globals as well as stuff from `std`/`os`).
- Synchronous import functions added (`require`, or the more flexible `std.importModule`).
  - Both of these functions provide the same module record object you would get via dynamic (async) import.
  - The `require` function is not fully CommonJS-compliant; for instance, `require.main` is not present.
- Module resolution functions added (`require.resolve`, or `std.resolveModule`).
- A builtin global function `inspect` is added, which pretty-prints any JS value as a string.
- A builtin global object `Module` is added.
  - `instanceof Module` can be used to identify module namespace objects.
  - You can specify additional implicit import specifier extensions by adding to the `Module.searchExtensions` array.
  - You can transform any file prior to evaluating it as a module by adding a function to the `Module.compilers` object. Useful for compile-to-ts languages like TypeScript, Coffeescript, etc.
  - You can define custom builtin modules using the `Module.define` function.
  - You can override module name normalization (aka module resolution) by replacing the `Module.resolve` function.
    - Note that you must handle `Module.searchExtensions` yourself in your replacement implementation.
  - You can override the method used to load modules by replacing the `Module.read` function.
    - Note that you must handle `Module.compilers` yourself in your replacement implementation.
- `os.access` function added (wrapper for libc `access`).
- `FILE.prototype.sync` method added (wrapper for `fsync`).
- `FILE.prototype.setvbuf` method added (wrapper for `setvbuf`).
- `std.isFILE` function added (returns whether the provided object is a `FILE` (via `js_std_file_class_id`)).
- `os.{WUNTRACED,WEXITSTATUS,WTERMSIG,WSTOPSIG,WIFEXITED,WIFSIGNALED,WIFSTOPPED,WIFCONTINUED}` added, for working with `os.waitpid`.
- `os.{S_IRWXU,S_IRUSR,S_IWUSR,S_IXUSR,S_IRWXG,S_IRGRP,S_IWGRP,S_IXGRP,S_IRWXO,S_IROTH,S_IWOTH,S_IXOTH}` added, for working with file modes.
- `"b"` mode flag is now allowed in `std.fdopen`.
- `setTimeout` and `clearTimeout` are now available as globals.
- `setInterval` and `clearInterval` are now available as globals.
- `String.cooked` is now available (no-op template tag, like the proposed [String.cooked](https://github.com/tc39/proposal-string-cooked)).
- `String.dedent` is now available (template tag function, like the proposed [String.dedent](https://github.com/tc39/proposal-string-dedent)).

## Changes to the `qjs` repl:

- The new `inspect` global is used to print results
- The last error is accessible via the `_error` global
- If a thrown error has additional properties added onto it, those are printed along with the thrown error
- Ctrl+W deletes words backwards from the cursor position

## New binary: `qjsbootstrap`:

Appending some JS code to the end of this binary changes it into a binary that executes that JS code:

```sh
$ cp qjsbootstrap my-program
$ echo 'console.log("hello!")' >> my-program
$ ./my-program
hello!
```

You can use this to create distributable binaries that run JS code without needing to use qjsc or a C compiler. Instructions [here](https://github.com/suchipi/quickjs/tree/main/src/qjsbootstrap).

> Note: On FreeBSD, `qjsbootstrap` requires procfs. You can mount it with `mount -t procfs proc /proc`. I started some work to use libprocstat instead, but haven't completed it yet.

## New module: "quickjs:bytecode"

A Module that exposes QuickJS's value <-> bytecode (de)serialization APIs to JavaScript code. Generated bytecode can be combined with `qjsbootstrap-bytecode` in the same way that source code strings can be combined with `qjsbootstrap`.

## New module: "quickjs:context"

A Module that allows JS code to create new JS Contexts (Realms). You can create new Contexts and run code inside them. Contexts can have certain features disabled (like eval) for security purposes. You can share values between Contexts. Contexts are destroyed when they get garbage-collected.

## New library: `quickjs-utils`

Helper structs, functions, and macros that make it easier to work with QuickJS objects in C code.

## Changes to project organization

- Stuff is reorganized into separate folders under `src`.
- Ninja is used instead of make. Ninja build config is generated via `.ninja.js` files which get loaded into [@suchipi/shinobi](https://github.com/suchipi/shinobi).
- macOS binaries are now cross-compiled from Linux
- we now compile ARM macOS binaries as well
  - These should work on both M1/M2/etc macbooks as well as on jailbroken iPhones/iPads
- we compile aarch64 (arm 64) binaries for linux, too
  - these are statically linked, so should work on a raspi/etc, in theory. maybe android, too
- Line endings have been made consistent and trailing whitespace has been removed
- FreeBSD support added (but there's no cross-compilation set up, so you'll have to compile it yourself from a FreeBSD machine).
- I'm in the process of converting the tests to a new format (which gets run by jest). But I haven't touched most of the old tests yet.

## Other changes

There are also probably some other miscellaneous changes I forgot to write down in the README.

# Compiling

The repo has stuff set up to compile quickjs binaries for Linux, macOS, iOS, FreeBSD, or Windows.

QuickJS itself has no external dependencies outside this repo except pthreads, and all of the code is C99. As such, it shouldn't be too difficult to get it compiling on other Unix-like OSes. OS-specific configuration is done by way of config files found in the `meta/ninja/env` folder.

Linux, macOS, iOS, and Windows binaries can be compiled using Docker. Or, you can compile binaries for just your own unix system, without using Docker.

If you're not gonna use Docker, you'll need to install [Ninja](https://ninja-build.org/) and [Node.js](https://nodejs.org/) in order to compile. I use Ninja 1.10.1 and Node.js 18.12.1, but it should work with most versions of both of those.

## Compilation Instructions

To compile binaries for Linux, macOS, iOS, and Windows (using Docker):

- Make sure you have docker installed.
- Clone the repo and cd to its folder
- Run `meta/docker/build-all.sh`
- Build artifacts will be placed in the `build` folder, organized by OS.

Or, to compile binaries for just your own unix system:

- Make sure you have both [Ninja](https://ninja-build.org/) and [Node.js](https://nodejs.org/) installed. I use Ninja 1.10.1 and Node.js 18.12.1, but it should work with most versions of both of those.
- Clone the repo and cd to its folder
- Run `meta/build.sh`
- Build artifacts will be placed in the `build` folder. You're probably most interested in stuff in the `build/bin` and `build/lib` folders.

If you are targeting an unsupported OS or would like to use a different compiler, set the environment variables `HOST` and `TARGET` both to "other", and then set the environment variables `CC`, `AR`, `CFLAGS`, and `LDFLAGS` as you see fit. There are some other variables you can set as well; see `meta/ninja/envs/target/other.ninja.js` and `meta/ninja/envs/host/other.ninja.js` for a list.

## Notes

The old tests for std and os aren't working right now; I really haven't touched them yet, so they're still expecting the old function signatures (returning errno, etc).
