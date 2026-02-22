#!/usr/bin/env bash
set -euo pipefail

export WASI_SDK_PATH=/opt/wasi-sdk

mkdir -p build

while IFS=$'\t' read -r TRIPLE HOST TARGET; do
  echo "----"
  echo "---- Building $TRIPLE ----"
  echo "----"
  env SKIP_NPM_INSTALL=1 BUILDDIR="build/$TRIPLE" HOST="$HOST" TARGET="$TARGET" meta/build.sh
done <<< "$QUICKJS_BUILDS"
