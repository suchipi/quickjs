# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@suchipi/quickjs`, a fork of the QuickJS JavaScript engine (by Fabrice Bellard) with extensive modifications: TypeScript type definitions, improved C API, additional builtin modules, enhanced module system, and cross-platform support.

The engine is written in C. Tests and build configuration are in TypeScript/JavaScript.

## Build Commands

| Command | What it does |
|---------|--------------|
| `env QUICKJS_EXTRAS=1 meta/build.sh test-platforms` | Build native + cross-platform outputs. **REQUIRED before `npm test`** - wine/wasm tests need the `x86_64-pc-windows-static` and `wasm32-unknown-wasip2` binaries. Also regenerates `meta/docs/*.md` from `.d.ts` files (no separate doc-build step needed). Do NOT hand-edit `meta/docs/*.md`. |
| `env QUICKJS_EXTRAS=1 meta/build.sh` | Native-only build (auto-detects `HOST`/`TARGET`); faster, but `npm test` will fail without the cross-platform outputs. |
| `meta/build.sh --platforms` | List the target triples that can be built (from `meta/docker/triples.tsv`). |
| `meta/build.sh x86_64-pc-windows-static` | Build only the Windows target via Docker. Any triple from `--platforms` works. |
| `meta/build.sh all` | Build every triple via Docker (`meta/docker/compile-all.sh`). |
| `meta/build.sh npm-platforms` | Build the triples the npm package ships (`npm/platforms.json`). |
| `meta/clean.sh` | Clean build artifacts. |
| `npm test` | Run all tests (vitest). |
| `npx vitest tests/foo.test.ts` | Run a single test file. |
| `npm run typecheck` | `tsc --noEmit` over the TypeScript sources. |
| `meta/compat/build.sh` | Regenerate the ECMAScript compatibility tables (see below). |

`QUICKJS_EXTRAS=1` enables build targets that aren't part of the shipped engine but that the test suite and test262 runner need: `run-test262`, the example shared-library modules (`fib.so`, `point.so`), and the `encoding-fuzzer` / `sample-program` / `stack-limit-test` programs. Most land in `build/extras/`.

Build requires: Ninja, Node.js (version pinned in `.nvmrc` / `.node-version`), Bash 4+, a C compiler (gcc/clang). Non-native targets additionally require Docker. The wine and wasm tests need `wine` and `wasmtime` on PATH; both suites are skipped when `CI` is set.

`meta/build.sh` runs `npm install`, generates `build.ninja` from `src/**/*.ninja.js` files via `meta/ninja/generate.js`, runs `ninja`, then writes `compile_commands.json` via `ninja -t compdb` so clangd can resolve the fork's split `src/lib/` headers. Native build outputs go to `build/` (`bin`, `lib`, `include`, `dts`, `extras`, `tests`, `intermediate`); Docker cross-builds go to `build/<triple>/`.

Cross-compilation: Set `HOST` and `TARGET` env vars to pick `meta/ninja/envs/host/*` and `meta/ninja/envs/target/*` files directly. `meta/docker/compile-all.sh` builds for all supported platforms via Docker.

**Always use `test-platforms` before `npm test`.** A plain `meta/build.sh` only produces the native platform's binaries, so cross-platform tests fail with "file not found" errors like `wine: failed to open "<rootDir>/build/x86_64-pc-windows-static/bin/qjs.exe": c0000135` - those look like real test failures but are purely the absence of the cross-platform outputs.

### Running build commands on Windows MSYS2

If you're running on Windows and the `Bash` tool's shell is Git Bash (`/usr/bin/bash` resolves under `C:/Program Files/Git/`), `meta/build.sh` will fail with `npm: command not found` even though Node is installed under `C:\msys64\ucrt64\bin\`. Git Bash has no `/ucrt64` mount and doesn't read MSYS2's `/etc/profile`. Wrap commands with MSYS2's bash, and `cd` to the repo inside `-c` (CHERE_INVOKING doesn't survive the env translation, so `--login` always lands in `$HOME`):

```bash
MSYSTEM=UCRT64 /c/msys64/usr/bin/bash --login -c \
  'cd /home/suchipi/Code/quickjs && env QUICKJS_EXTRAS=1 meta/build.sh'
```

See [.claude/research/msys2-bash-tool-environment-2026-05-24-025658Z.md](.claude/research/msys2-bash-tool-environment-2026-05-24-025658Z.md) for details.

## Build System Architecture

The build uses Ninja with a JavaScript-based configuration layer (`@suchipi/shinobi`):

- `meta/ninja/defs.ninja.js` - Variable definitions
- `meta/ninja/rules.ninja.js` - Build rules (cc, link, ar, shared_lib, qjsc, copy)
- `meta/ninja/envs/host/*.ninja.js` and `meta/ninja/envs/target/*.ninja.js` - Platform-specific compiler configs
- `src/**/*.ninja.js` - Per-component build declarations

All rules have `_host` and `_target` variants for cross-compilation.

## Test Infrastructure

Tests use Vitest. Most tests are integration tests that spawn compiled binaries using the `first-base` library and snapshot stdout/stderr/exit codes.

- Test files: `tests/*.test.ts`
- Test utilities: `tests/_utils.ts` (path markers `rootDir`, `binDir`, `fixturesDir`, `testsWorkDir`, `winBinDir`, `qjsExe`; the `wineSpawn` / `setupWineHooks` helpers; the `shouldRunWineTests` / `shouldRunWasmTests` gates; and `removeSanitizer` / `restoreSanitizer`)
- Test fixtures: `tests/fixtures/`; scratch dir `tests/workdir/`
- Tests must be built first (`meta/build.sh test-platforms`) since they run compiled binaries from `build/bin/` and cross-compiled outputs under `build/<target>/bin/`
- Snapshot stability comes from `first-base`'s `sanitizers`, applied by `run.cleanResult()`. `tests/_setup.ts` registers the fork's own: absolute paths (including the wine `Z:\...` form) become `<rootDir>`, and `:LINE:COL` is stripped from stack-frame `at ...` lines. Add a sanitizer rather than abandoning inline snapshots (see `.claude/rules/firstbase-inline-snapshots.md`)

## ECMAScript Compatibility Tables

`meta/compat/` generates [compat-table](https://github.com/compat-table/compat-table)-style HTML pages showing which ECMAScript features the fork implements, by running compat-table's own feature tests against a built `qjs`. `meta/compat/compat-table/` is a git submodule; `meta/compat/build.sh` fetches it, installs its dependencies, runs the tests, and writes the pages to `meta/compat/output/` (gitignored; removed by `meta/clean.sh`). It needs a built engine first, plus network access for that initial `npm install`. Nothing here runs in CI and results aren't checked in, so the tables reflect whichever binary was last tested. Options and implementation notes: [meta/compat/README.md](meta/compat/README.md).

## Source Architecture

### Core Engine (`src/quickjs/`)

The QuickJS C engine: parser, compiler, bytecode interpreter, garbage collector. `quickjs.c` is the main ~63k-line file. `quickjs.h` is the C API header. `quickjs.d.ts` has TypeScript type definitions for the JS-facing API.

### Libraries (`src/lib/`)

Standalone C libraries used by the engine: `libregexp` (regex), `dtoa` (float64 parsing/printing), `cutils`, `quickjs-utils`, and small helpers like `execpath`, `debugprint`, `gettime`, `list`. `libbf` is gone: BigInt now uses upstream's optimized implementation (`422ca5d`), so references to `src/lib/libbf/` in older notes are stale. The `encoding/` subdirectory contains text encoding libraries: `libunicode`, `utf-conv`, `libbig5`, `libeucjp`, `libeuckr`, `libgb18030`, `libshiftjis`, `libwindows1251`, `libwindows1252`.

### Builtin Modules (`src/builtin-modules/`)

JS modules compiled to C bytecode and embedded in the engine. Each exposes a `"quickjs:*"` import path:

- `quickjs-std` → `"quickjs:std"` - C stdlib bindings
- `quickjs-os` → `"quickjs:os"` - OS bindings
- `quickjs-cmdline` → `"quickjs:cmdline"` - Command line arguments access
- `quickjs-timers` → `"quickjs:timers"` - Timer functions (setTimeout, setInterval, etc.)
- `quickjs-engine` → `"quickjs:engine"` - Script execution, module loading, GC control
- `quickjs-bytecode` → `"quickjs:bytecode"` - Bytecode serialization
- `quickjs-context` → `"quickjs:context"` - Realm/Context creation
- `quickjs-encoding` → `"quickjs:encoding"` - Text encoding/decoding

### Event Loop (`src/quickjs-eventloop/`)

The event loop implementation used by the runtime (extracted from the former `quickjs-libc`).

### Globals (`src/globals/`)

Global functions injected into every context: `inspect()`, `console.log`/`print`. Timer functions (`setTimeout`/`setInterval`/`clearTimeout`/`clearInterval`) are provided by the `quickjs:timers` builtin module but are also available globally.

### Programs (`src/programs/`)

Standalone executables built from the engine:

- `qjs` - Full REPL and script runner
- `qjsc` - JavaScript-to-C bytecode compiler
- `qjsbootstrap` - Binary stub that runs JS appended to it
- `quickjs-run` - Minimal script runner (for testing)
- `repl` - REPL implementation (JS, compiled into qjs)
- `file-to-bytecode` - `quickjs-run` script that compiles a JS file to a bytecode file (copied to `build/bin/file-to-bytecode.js`)
- `encoding-fuzzer` - fuzzer for the `src/lib/encoding/` libraries; host program in `build/bin/`, built only with `QUICKJS_EXTRAS=1`
- `sample-program`, `stack-limit-test` - dev/test helpers, built to `build/extras/` only with `QUICKJS_EXTRAS=1`

`src/programs/log-argv/` exists but is not wired into the build: its build declarations live in `log-argv.js`, which `src/**/*.ninja.js` doesn't glob.

### Module System (`src/quickjs-modulesys/`)

Custom module loader supporting: extension inference (`.js` optional), `index.js` resolution, CommonJS `require()`, `import.meta.require`/`import.meta.resolve`, `ModuleDelegate` hooks, and builtin module registration.

### Archives (`src/archives/`)

Ninja configs for building static library archives: `full` (complete engine with all builtins) and `core` (minimal engine).

### Other (`src/`)

- `run-test262/` - Test262 compliance test runner (`run.sh`, `test262.conf`, and the `test262_errors.txt` baseline)
- `shared-library-modules/` - Example shared library modules (fib, point)

### Outside `src/`

- `meta/` - build entry points (`build.sh`, `clean.sh`, `ci.sh`), Ninja config (`ninja/`), Docker cross-compile setup (`docker/`), generated API docs (`docs/`), and the compat-table generator (`compat/`)
- `npm/` - npm package wrapper: `platforms.json` (published triples), `run-binary.js`, and the `qjs` / `qjsc` / `quickjs-run` CLI shims
- `examples/` - small standalone example scripts
- `tests/` - vitest suites (see Test Infrastructure)

## Upstream Catch-Up

The fork is being brought up to date with `bellard/quickjs` one upstream commit at a time. `upstream-merge-status.md` in the repo root is the canonical tracker: one row per upstream commit with a status (PENDING / PORT / SKIP-NA / SKIP-DONE / SKIP-BAD) and porting notes. The protocol itself, including the upstream-path-to-fork-path map and the ancestry-marker merge convention, is in [.claude/upstream-merge/plan.md](.claude/upstream-merge/plan.md); it carries the narrow git-mutation exemption described in `.claude/rules/no-git-mutations.md`.

## Research Tasks

When asked to research or investigate something in the codebase, you MUST save findings to a file in `.claude/research/` following the conventions in `.claude/rules/research-conventions.md`. The research file IS the deliverable - do not just present findings in chat without creating the file.

## Supported Platforms

Linux (amd64, aarch64; glibc, musl, static), macOS (x86_64, arm64), Windows (x86_64 via MSYS2), FreeBSD (amd64, aarch64), WebAssembly (wasip2 and emscripten), Cosmopolitan Libc.

`meta/docker/triples.tsv` is the source of truth for buildable triples and the host/target env files each one uses; `npm/platforms.json` lists the subset the npm package publishes.
