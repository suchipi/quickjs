---
paths:
  - "meta/docker/**"
  - "meta/build.sh"
  - "meta/ninja/envs/**"
---

# Docker Build System

## Build Flow

`meta/build.sh <platform>` is the user-facing entry point. It looks up the platform triple in `meta/docker/triples.tsv`, extracts the Docker image name, and calls `meta/docker/compile.sh <image> <tsv-data>`.

`compile.sh` orchestrates three steps:
1. `precompile.sh` — ensures `node_modules` exists (runs `npm install` in a Node Docker container if needed)
2. `build-image.sh` — builds the Docker image from the subdirectory matching the image name
3. `run-compile-cmd.sh` — runs `docker run` with the repo volume-mounted to `/opt/quickjs`, passing `QUICKJS_BUILDS` TSV data as an env var

Inside the container, each image's `cmd.sh` iterates over `$QUICKJS_BUILDS` lines and calls `meta/build.sh` with `HOST` and `TARGET` env vars set, plus `SKIP_NPM_INSTALL=1`.

## triples.tsv Format

Tab-separated: `TRIPLE`, `IMAGE`, `HOST`, `TARGET`. The IMAGE column maps to a subdirectory under `meta/docker/`. HOST and TARGET map to ninja env files at `meta/ninja/envs/host/<HOST>.ninja.js` and `meta/ninja/envs/target/<TARGET>.ninja.js`.

## Naming Convention: "build" vs "compile"

Scripts that build Docker images are named `build-*` (e.g. `build-image.sh`, `build-all-images.sh`). Scripts that compile quickjs inside containers are named `compile-*` (e.g. `compile.sh`, `compile-all.sh`, `run-compile-cmd.sh`, `precompile.sh`).

## Cross-Compilation Ninja Envs

Cross-compilation target envs are named `cross-<os>-<arch>.ninja.js` (e.g. `cross-freebsd-x86_64`). They declare `CC_TARGET`, `AR_TARGET`, and linker flags. The HOST env is always `linux` since all Docker containers run Linux.

## Non-obvious Details

- `compile.sh` accepts an optional second argument (TSV data). If omitted, it reads `triples.tsv` and filters by image name. When called from `compile-all.sh` or `meta/build.sh`, the TSV data is passed explicitly.

- Docker images pass the host UID/GID as build args so files created inside the container have correct ownership on the host.

- The `multi-*` image naming pattern means the image builds multiple architecture targets (e.g. `multi-unknown-freebsd` builds both x86_64 and aarch64 FreeBSD).

- FreeBSD cross-compilation uses clang with `--sysroot` pointing to extracted FreeBSD base system headers/libs. The `FREEBSD_RELEASE` Dockerfile build arg propagates to an env var used by the `freebsd-cc-*` wrapper scripts for the `--target` triple.

- FreeBSD cross-compilation uses `llvm-ar` (target-independent) rather than architecture-specific ar wrappers.

- The `-fuse-ld=lld` flag in FreeBSD wrapper scripts produces harmless warnings during compilation (only relevant during linking). These can be ignored.

- `imitation-ci-image` is not part of the build pipeline — it's not referenced in `triples.tsv`.

- Windows cross-compilation uses MinGW (`x86_64-w64-mingw32-gcc`) and links statically to avoid runtime DLL dependencies.
