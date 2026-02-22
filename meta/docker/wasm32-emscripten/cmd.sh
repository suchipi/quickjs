#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building wasm32-emscripten-generic ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-emscripten-generic HOST=linux TARGET=emscripten-generic meta/build.sh

echo "----"
echo "---- Building wasm32-emscripten-node ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-emscripten-node HOST=linux TARGET=emscripten-node meta/build.sh

echo "----"
echo "---- Building wasm32-emscripten-web ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-emscripten-web HOST=linux TARGET=emscripten-web meta/build.sh

echo "----"
echo "---- Building wasm32-emscripten-js ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-emscripten-js HOST=linux TARGET=emscripten-js meta/build.sh
