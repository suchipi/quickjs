#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building wasm ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/multi-unknown-wasm HOST=linux TARGET=wasm meta/build.sh
