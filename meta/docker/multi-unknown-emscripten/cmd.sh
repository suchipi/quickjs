#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building wasm32-unknown-emscripten-generic ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-unknown-emscripten-generic HOST=linux TARGET=emscripten-generic meta/build.sh

echo "----"
echo "---- Building wasm32-unknown-emscripten-node ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-unknown-emscripten-node HOST=linux TARGET=emscripten-node meta/build.sh

echo "----"
echo "---- Building wasm32-unknown-emscripten-web ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-unknown-emscripten-web HOST=linux TARGET=emscripten-web meta/build.sh

echo "----"
echo "---- Building js-unknown-emscripten ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/js-unknown-emscripten HOST=linux TARGET=emscripten-js meta/build.sh
