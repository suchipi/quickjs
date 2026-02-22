#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building x86_64-pc-windows-static (MinGW) ----"
echo "----"
env SKIP_NPM_INSTALL=1 BUILDDIR=build/x86_64-pc-windows-static HOST=linux TARGET=cross-windows-x86_64 meta/build.sh
