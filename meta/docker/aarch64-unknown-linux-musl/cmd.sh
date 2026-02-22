#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building aarch64-unknown-linux-musl ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/aarch64-unknown-linux-musl HOST=linux TARGET=linux meta/build.sh

echo "----"
echo "---- Building aarch64-unknown-linux-static ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/aarch64-unknown-linux-static HOST=linux-static TARGET=linux-static meta/build.sh
