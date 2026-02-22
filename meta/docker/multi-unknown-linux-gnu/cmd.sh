#!/usr/bin/env bash
set -euo pipefail

/opt/quickjs/meta/docker/multi-unknown-linux-gnu/fixup-gcc-libs.sh

mkdir -p build

while IFS=$'\t' read -r TRIPLE HOST TARGET; do
  echo "----"
  echo "---- Building $TRIPLE ----"
  echo "----"
  env SKIP_NPM_INSTALL=1 BUILDDIR="build/$TRIPLE" HOST="$HOST" TARGET="$TARGET" meta/build.sh
done <<< "$QUICKJS_BUILDS"
