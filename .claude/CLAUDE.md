# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@suchipi/quickjs`, a fork of the QuickJS JavaScript engine (by Fabrice Bellard) with extensive modifications: TypeScript type definitions, improved C API, additional builtin modules, enhanced module system, and cross-platform support.

The engine is written in C. Tests and build configuration are in TypeScript/JavaScript.

## Build Commands

```bash
meta/build.sh              # Build for current platform (auto-detects HOST/TARGET OS)
meta/clean.sh              # Clean build artifacts
npm test                   # Run all tests (jest --runInBand)
npx jest tests/foo.test.ts --runInBand  # Run a single test file
```

Build requires: Ninja, Node.js 18+, Bash 4+, a C compiler (gcc/clang).

`meta/build.sh` runs `npm install`, generates `build.ninja` from `src/**/*.ninja.js` files via `meta/ninja/generate.js`, then runs `ninja`. Build outputs go to `build/` (bin, lib, include, dts, intermediate).

Cross-compilation: Set `HOST` and `TARGET` env vars. `meta/docker/build-all.sh` builds for all supported platforms via Docker.

## Build System Architecture

The build uses Ninja with a JavaScript-based configuration layer (`@suchipi/shinobi`):
- `meta/ninja/defs.ninja.js` - Variable definitions
- `meta/ninja/rules.ninja.js` - Build rules (cc, link, ar, shared_lib, qjsc, copy)
- `meta/ninja/envs/host/*.ninja.js` and `meta/ninja/envs/target/*.ninja.js` - Platform-specific compiler configs
- `src/**/*.ninja.js` - Per-component build declarations

All rules have `_host` and `_target` variants for cross-compilation.

## Test Infrastructure

Tests use Jest with Babel (for TypeScript). Most tests are integration tests that spawn compiled binaries using the `first-base` library and snapshot stdout/stderr/exit codes.

- Test files: `tests/*.test.ts`
- Test utilities: `tests/_utils.ts` (provides `rootDir`, `binDir`, `fixturesDir`, `cleanString`, `cleanResult`)
- Test fixtures: `tests/fixtures/`
- Tests must be built first (`meta/build.sh`) since they run compiled binaries from `build/bin/`
- `cleanString()` replaces absolute paths with `<rootDir>` for stable snapshots

## Source Architecture

### Core Engine (`src/quickjs/`)
The QuickJS C engine: parser, compiler, bytecode interpreter, garbage collector. `quickjs.c` is the main ~54k-line file. `quickjs.h` is the C API header. `quickjs.d.ts` has TypeScript type definitions for the JS-facing API.

### Libraries (`src/lib/`)
Standalone C libraries used by the engine: `libbf` (BigFloat), `libregexp` (regex), `libunicode`, `cutils`, and small helpers like `execpath`, `debugprint`, `list`, `utf-conv`.

### Builtin Modules (`src/builtin-modules/`)
JS modules compiled to C bytecode and embedded in the engine. Each exposes a `"quickjs:*"` import path:
- `quickjs-libc` → `"quickjs:std"`, `"quickjs:os"` - C stdlib and OS bindings
- `quickjs-engine` → `"quickjs:engine"` - Script execution, module loading, GC control
- `quickjs-bytecode` → `"quickjs:bytecode"` - Bytecode serialization
- `quickjs-context` → `"quickjs:context"` - Realm/Context creation
- `quickjs-pointer` → `"quickjs:pointer"` - Opaque pointer wrapper
- `quickjs-encoding` → `"quickjs:encoding"` - Text encoding/decoding

### Globals (`src/globals/`)
Global functions injected into every context: `inspect()`, `console.log`/`print`, `setTimeout`/`setInterval`/`clearTimeout`/`clearInterval`.

### Programs (`src/programs/`)
Standalone executables built from the engine:
- `qjs` - Full REPL and script runner
- `qjsc` - JavaScript-to-C bytecode compiler
- `qjsbootstrap` - Binary stub that runs JS appended to it
- `quickjs-run` - Minimal script runner (for testing)
- `repl` - REPL implementation (JS, compiled into qjs)

### Module System (`src/quickjs-modulesys/`)
Custom module loader supporting: extension inference (`.js` optional), `index.js` resolution, CommonJS `require()`, `import.meta.require`/`import.meta.resolve`, `ModuleDelegate` hooks, and builtin module registration.

### Archives (`src/archives/`)
Ninja configs for building static library archives: `full` (complete engine with all builtins) and `core` (minimal engine).

## Supported Platforms

Linux (amd64, aarch64; glibc, musl, static), macOS (x86_64, arm64), Windows (x86_64 via MSYS2), FreeBSD, Cosmopolitan Libc.
