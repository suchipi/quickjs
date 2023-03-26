#!/usr/bin/env bash
set -euo pipefail

mkdir -p build

echo "----"
echo "---- Building linux-musl (amd64) ----"
echo "----"
env BUILDDIR=build/linux-musl-amd64 HOST=linux TARGET=linux meta/build.sh

echo "----"
echo "---- Building linux-musl-static (amd64) ----"
echo "----"
env BUILDDIR=build/linux-musl-static-amd64 HOST=linux-static TARGET=linux-static meta/build.sh
