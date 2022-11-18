#!/usr/bin/env bash
set -euo pipefail

git config --global --add safe.directory /opt/quickjs
meta/clean.sh

mkdir -p build

echo "----"
echo "---- Building linux ----"
echo "----"
env BUILDDIR=build/linux HOST=linux TARGET=linux meta/build.sh

echo "----"
echo "---- Building darwin (arm) ----"
echo "----"
env BUILDDIR=build/darwin-arm HOST=linux TARGET=cross-darwin-arm meta/build.sh

echo "----"
echo "---- Building darwin (x86) ----"
echo "----"
env BUILDDIR=build/darwin-x86 HOST=linux TARGET=cross-darwin-x86 meta/build.sh

echo "----"
echo "---- Building windows ----"
echo "----"
env BUILDDIR=build/windows HOST=linux TARGET=cross-windows meta/build.sh
