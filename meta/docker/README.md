# Docker Build System

This directory contains Docker-based cross-compilation infrastructure for building quickjs on all supported platforms.

## Quick Start

The easiest way to build for a specific platform is via `meta/build.sh` in the repo root, which looks up the right Docker image automatically:

```bash
# Build for a specific platform triple:
meta/build.sh x86_64-pc-windows-static

# Build for all platforms:
meta/build.sh all

# List available platform triples:
meta/build.sh --platforms
```

You can also invoke the Docker scripts directly using Docker image names:

```bash
# Build all targets for a specific Docker image:
meta/docker/compile.sh x86_64-pc-windows-static

# Build all platforms:
meta/docker/compile-all.sh
```

## Scripts in `meta/docker`

### `compile.sh`

Builds one or more targets using a specific Docker image. Can be called with just an image name (reads targets from `triples.tsv`), or with explicit TSV data as a second argument.

```bash
# Automatic lookup from triples.tsv:
meta/docker/compile.sh x86_64-pc-windows-static

# Explicit TSV data (used by meta/docker/compile-all.sh and meta/build.sh):
meta/docker/compile.sh multi-apple-darwin "$TSV_DATA"
```

Runs precompile, builds the Docker image, then runs the compilation inside the container.

### `compile-triples.sh`

Groups the given platform triples by Docker image (from `triples.tsv`), then calls `compile.sh` once per image. This avoids re-running multi-target images (like `multi-apple-darwin`) when building multiple triples that share the same image.

```bash
# Build two triples, grouped by image:
meta/docker/compile-triples.sh x86_64-pc-windows-static wasm32-unknown-wasip2

# Build all npm platform triples:
meta/docker/compile-triples.sh aarch64-apple-darwin x86_64-apple-darwin ...
```

### `compile-all.sh`

Builds all platforms defined in `triples.tsv`. Cleans build artifacts first, uses `compile-triples.sh` to group targets by Docker image, then consolidates TypeScript definition outputs.

### `build-image.sh`

Builds a single Docker image by subdirectory name. Passes your UID/GID as build args so file permissions work correctly inside the container.

### `build-all-images.sh`

Builds all Docker images referenced in `triples.tsv` without running any builds.

### `precompile.sh`

Ensures `node_modules` is installed by running `npm install` inside a Node.js Docker container (using the version from `.node-version`). Skipped if `node_modules` already exists.

### `run-compile-cmd.sh`

Low-level script that runs a Docker container for a given image. Volume-mounts the repository into the container and sets build environment variables (`QUICKJS_EXTRAS`, `QUICKJS_BUILDS`). Delegates to the image's `cmd.sh`.

### `ROOT_DIR.sh`

Utility sourced by other scripts to resolve the absolute path to the repository root. Handles MSYS2/Cygwin path conversion on Windows.

## Configuration

### `triples.tsv`

Tab-separated build matrix with columns: `TRIPLE`, `IMAGE`, `HOST`, `TARGET`. Maps each platform triple to its Docker image and build configuration.

### `lib/`

Shared shell utilities sourced by the `cmd.sh` scripts inside each Docker image.

## Docker Image Directories

Each subdirectory contains a `Dockerfile` and a `cmd.sh` that runs inside the container:

| Directory                    | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `aarch64-unknown-linux-musl` | ARM64 Linux (Alpine-based)                                                       |
| `x86_64-unknown-linux-musl`  | x64 Linux (Alpine-based)                                                         |
| `multi-apple-darwin`         | macOS cross-compilation (x86_64 and aarch64, via osxcross)                       |
| `multi-unknown-linux-gnu`    | Linux glibc cross-compilation (x86_64 and aarch64)                               |
| `multi-unknown-emscripten`   | Emscripten/WebAssembly targets                                                   |
| `multi-unknown-freebsd`      | FreeBSD cross-compilation (x86_64 and aarch64, via clang)                        |
| `wasm32-unknown-wasip2`      | WASI Preview 2 (via wasi-sdk)                                                    |
| `x86_64-pc-windows-static`   | Windows cross-compilation (via MinGW)                                            |
| `imitation-ci-image`         | Simulated CI environment for local testing. Not part of the docker build system. |
