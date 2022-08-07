# suchipi/quickjs

Fork of the fantastic QuickJS engine by Fabrice Bellard, with the following changes:

## Changes to `quickjs-libc`:

- APIs in `std` and `os` no longer return errno anywhere; instead, Error objects are thrown. `errno` is available as a property on the thrown Error objects.
- In places where APIs in `std` or `os` would return null on failure, now an error will be thrown instead.
- A TypeScript `.d.ts` file is provided for all APIs.
- Synchronous import functions added (`require`, or the more flexible `std.importModule`).
  - Both of these functions provide the same module record object you would get via dynamic (async) import.
  - The `require` function is not fully CommonJS-compliant; stuff like `require.main` and `require.resolve` are not present.
- `.js` extensions can now be omitted from import specifiers; they're optional.
- If your import specifier points to a folder, it will attempt to load `index.js` from that folder.
- `os.access` function added (wrapper for libc `access`).
- `FILE.prototype.sync` method added (wrapper for `fsync`).

## Changes to `quickjs`:

- Additional hooks are exposed that allow importing modules synchronously or asynchronously:
  - `JS_DynamicImportAsync`
  - `JS_DynamicImportSync`
  - `JS_DynamicImportSync2` (additional arg for specifying basename that the import specifier is relative to)

## Changes to project organization

- Stuff is reorganized into separate folders under `src`.
- `tup` is used to organize the build system, instead of everything being in a big Makefile. But you don't _need_ tup to build; only to update the build scripts (which are commited in git).

There are also probably some other miscellaneous changes I forgot.

# Compiling

The repo has stuff set up to compile quickjs binaries for Linux, macOS, iOS, or Windows. Compilation takes place via Docker.

The project has no external dependencies outside this repo, and all of the code is C99. As such, it shouldn't be too difficult to get it compiling on other Unix-like OSes, such as FreeBSD. OS-specific configs for the build process live in the `configs` folder, and symlinks in the `build-<os-name>` folders point to those configs in order to link them into the build system. Read about "variants" in the [tup manual](https://gittup.org/tup/manual.html) for more info.

## Compilation Instructions

- Clone the repo and cd to its folder
- Run `./docker/build-images.sh`
- Run either `./docker/run-image.sh linux`, `./docker/run-image.sh windows`, `./docker/run-image.sh darwin`, or `./docker/run-image.sh darwin-arm` depending on what binaries you want to create (`darwin` means macOS x64, `darwin-arm` means macOS ARM and iOS).
- You will now be in a shell inside a docker container. Run `make`.
- Assuming everything compiled correctly, you can now exit the docker container shell by pressing Ctrl+D.
- Build artifacts will be present within the `build` folder (which is a symlink). The directory structure inside that folder mirrors the structure at the repo root. The most notable artifacts are:
  - `./build/src/archive/quickjs.target.a` - A C library you can link against which contains everything from `quickjs` and `quickjs-libc`.
  - `./build/src/qjs/qjs.target` - the `qjs` command-line interpreter and repl
  - `./build/src/qjsc/qjsc.target` - the `qjsc` command-line tool which can compile JS code into C programs containing the bytecode for that JS. Can be used to distribute utilities written in JavaScript as statically-linked binaries.

## Updating buildscripts

This repo's build requirements and commands are organized using `tup`, an alternative to make. It makes organizing things in a modular way easier and its config files are (in my opinion) a bit clearer to read.

But, `tup` relies on FUSE, which is inconvenient to use in some cases, such as on macOS or in CI. Additionally, the specific version of `tup` I use isn't readily available in some OS package managers.

So, even though I use tup for development, I also provide a build method that can work without tup. Tup has the ability to generate normal `.sh` scripts which can be run in an environment where tup isn't installed. Tup does this by walking the tree of tup-related files in the repo, identifying what depends on what, and then outputting the list of commands that it would run, in the order that it would run them, if the repo had just been freshly cloned. The generated scripts are checked into git, in the `buildscripts` folder. This makes things more convenient for people who will not be working on this repo very much and just want to compile it.

This does mean, though, that if any of the tup-related files are changed (`Tuprules.tup`, variant `.config` files, or `Tupfile`s), the buildscripts need to be updated to match what tup itself would do. To update the buildscripts:

- Install [`tup`](https://gittup.org/tup/) 0.7.11.
  - On Linux, you can download [a tar.gz from the tup website](https://gittup.org/tup/releases/tup-v0.7.11.tar.gz) and put the `tup` binary somewhere in your `PATH`. I recommend `~/.local/bin`.
  - On macOS you can get tup with either [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/). I recommend MacPorts as in my personal experience, it is more stable, has better UX, and has more fine-grained package versions available.
- Clone the repo and cd to its folder
- Run `make update-buildscripts`
  - If you run into an error about `.o` files existing that aren't supposed to exist, run `git clean -dfX src` to remove them.
