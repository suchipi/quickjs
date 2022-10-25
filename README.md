# suchipi/quickjs

Fork of the fantastic QuickJS engine by Fabrice Bellard, with the following changes:

## Changes to `quickjs-libc`:

- APIs in `std` and `os` no longer return errno anywhere; instead, Error objects are thrown. `errno` is available as a property on the thrown Error objects.
- In places where APIs in `std` or `os` would return null on failure, now an error will be thrown instead.
- Error messages from `std` and `os` include information in the message such as the path to the file that couldn't be loaded. This info is also available as properties on the Error object.
- A builtin `inspect` function is added, which pretty-prints any JS value as a string.
- A TypeScript `.d.ts` file is provided for all APIs.
- Synchronous import functions added (`require`, or the more flexible `std.importModule`).
  - Both of these functions provide the same module record object you would get via dynamic (async) import.
  - The `require` function is not fully CommonJS-compliant; stuff like `require.main` and `require.resolve` are not present.
- `.js` extensions can now be omitted from import specifiers; they're optional.
- If your import specifier points to a folder, it will attempt to load `index.js` from that folder.
- Adds a global `Module` object with a `Symbol.hasInstance` property defined such that it can be used to identify module namespace objects.
- You can specify additional implicit import specifier extensions by adding to the `Module.searchExtensions` array.
- You can transform any file prior to evaluating it as a module by adding a function to the `Module.compilers` object. Useful for compile-to-ts languages like TypeScript, Coffeescript, etc.
- `os.access` function added (wrapper for libc `access`).
- `FILE.prototype.sync` method added (wrapper for `fsync`).
- `std.isFILE` function added (returns whether the provided object is a `FILE` (via `js_std_file_class_id`)).
- `os.{WUNTRACED,WEXITSTATUS,WTERMSIG,WSTOPSIG,WIFEXITED,WIFSIGNALED,WIFSTOPPED,WIFCONTINUED}` added, for working with `os.waitpid`.

## Changes to `quickjs`:

- Additional functions are exposed that allow importing modules synchronously or asynchronously:
  - `JS_DynamicImportAsync`
  - `JS_DynamicImportSync`
  - `JS_DynamicImportSync2` (additional arg for specifying basename that the import specifier is relative to)
- Additional error-related functions added:
  - `JS_ThrowError`
  - `JS_AddPropertyToException`

## Changes to project organization

- Stuff is reorganized into separate folders under `src`.
- `tup` is used to organize the build system, instead of everything being in a big Makefile. But you don't _need_ tup to build; only to update the build scripts (which are commited in git).
- macOS binaries are now cross-compiled from Linux
- we now compile ARM macOS binaries as well
  - These should work on both M1/M2/etc macbooks as well as on jailbroken iPhones/iPads
- Line endings have been made consistent and trailing whitespace has been removed

There are also probably some other miscellaneous changes I forgot.

# Compiling

The repo has stuff set up to compile quickjs binaries for Linux, macOS, iOS, or Windows. Compilation takes place via Docker.

The project has no external dependencies outside this repo except pthreads, and all of the code is C99. As such, it shouldn't be too difficult to get it compiling on other Unix-like OSes, such as FreeBSD. OS-specific configuration is done by way of environment variables, found in the `meta/envs` folder.

## Compilation Instructions

To compile just for your own linux or macOS machine:

- Clone the repo and cd to its folder
- Run `meta/build.sh`
- Build artifacts will be next to their sources, in folders under `src`.

Or, to compile for all platforms (using Docker):

- Clone the repo and cd to its folder
- Run `meta/docker/build-all.sh`
- Build artifacts will be in `meta/artifacts`

## Updating buildscripts

This repo's build requirements and commands are organized using `tup`, an alternative to make. It makes organizing things in a modular way easier and its config files are (in my opinion) a bit clearer to read.

But, `tup` relies on FUSE, which is inconvenient to use in some cases, such as on macOS or in CI. Additionally, the specific version of `tup` I use (tup v0.7.11-95-g4e9f5b32) isn't readily available in OS package managers.

So, even though I use tup for development, I also provide a build method that can work without tup. Tup has the ability to generate normal `.sh` scripts which can be run in an environment where tup isn't installed. Tup does this by walking the tree of tup-related files in the repo, identifying what depends on what, and then outputting the list of commands that it would run, in the order that it would run them, if the repo had just been freshly cloned. The generated scripts are checked into git, in the `meta/buildscripts` folder. This makes things more convenient for people who will not be working on this repo very much and just want to compile it.

This does mean, though, that if any tup-related files (`Tuprules.tup` or `Tupfile`s) are changed/added/removed, the buildscripts need to be updated to match what tup itself would do.

`meta/build.sh` either runs tup or runs a generated buildscript, depending on if `tup` is present in PATH. It's worth noting that the generated buildscripts *always* build everything, whereas running `tup` would only build the things that have changed on disk. So `tup` is nicer when iterating on stuff, but if you don't care, it's easier to use the generated buildscripts.

Anyway, in the event that you change, add, or remove tup-related files, here's what you should do to update the buildscripts:

- Compile and install [`tup`](https://gittup.org/tup/) from [this specific commit on github](https://github.com/gittup/tup/tree/4e9f5b328f43fbfbdff88da7b4520efb1f1a5263)
- Run `meta/update-buildscripts.sh`

I recognize that depending on a weird specific commit of tup instead of a tagged version is not ideal. I do this because I need the `import` feature of tup in order to use environment variables to specify OS-specific configuration, and `import` doesn't seem to work in the latest tagged version (v0.7.11). I previously used tup's "variants" feature to define OS-specific info instead, but things got really messy...

## Notes

The tests aren't working right now; I really haven't touched them yet, so they're still expecting the old APIs for std/os.
