#!/usr/bin/env bash
set -euo pipefail

/opt/quickjs/meta/docker/multi-unknown-linux-gnu/fixup-gcc-libs.sh

mkdir -p build

echo "----"
echo "---- Building linux (x86_64) ----"
echo "----"
env SKIP_BUN_INSTALL=1 BUILDDIR=build/x86_64-unknown-linux-gnu HOST=linux TARGET=cross-linux-x86_64 meta/build.sh

echo "----"
echo "---- Building linux (aarch64) ----"
echo "----"
env SKIP_BUN_INSTALL=1 BUILDDIR=build/aarch64-unknown-linux-gnu HOST=linux TARGET=cross-linux-aarch64 meta/build.sh
