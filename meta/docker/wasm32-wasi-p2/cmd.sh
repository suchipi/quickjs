#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building wasm32-wasi-p2 ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/wasm32-wasi-p2 WASI_SDK_PATH=/opt/wasi-sdk HOST=linux TARGET=wasi-p2 meta/build.sh
