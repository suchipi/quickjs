#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building wasm32-emscripten ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-emscripten HOST=linux TARGET=emscripten meta/build.sh
