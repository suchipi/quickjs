#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building windows MinGW (x86_64) ----"
echo "----"
env SKIP_BUN_INSTALL=1 BUILDDIR=build/x86_64-pc-windows-static HOST=linux TARGET=cross-windows-x86_64 meta/build.sh
