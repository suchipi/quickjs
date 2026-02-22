#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building x86_64-apple-darwin ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/x86_64-apple-darwin HOST=linux TARGET=cross-darwin-x86_64 meta/build.sh

echo "----"
echo "---- Building aarch64-apple-darwin ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/aarch64-apple-darwin HOST=linux TARGET=cross-darwin-arm64 meta/build.sh
