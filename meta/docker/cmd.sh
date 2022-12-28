#!/usr/bin/env bash
set -euo pipefail

/opt/quickjs/meta/docker/fixup-gcc-libs.sh

git config --global --add safe.directory /opt/quickjs
meta/clean.sh

mkdir -p build

echo "----"
echo "---- Building linux (amd64) ----"
echo "----"
env BUILDDIR=build/linux-amd64 HOST=linux TARGET=cross-linux-x86_64 meta/build.sh

echo "----"
echo "---- Building linux (aarch64) ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/linux-aarch64 HOST=linux TARGET=cross-linux-aarch64 meta/build.sh

echo "----"
echo "---- Building darwin (x86_64) ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/darwin-x86_64 HOST=linux TARGET=cross-darwin-x86_64 meta/build.sh

echo "----"
echo "---- Building darwin (arm64) ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/darwin-arm64 HOST=linux TARGET=cross-darwin-arm64 meta/build.sh

echo "----"
echo "---- Building windows (x86_64) ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/windows-x86_64 HOST=linux TARGET=cross-windows-x86_64 meta/build.sh
