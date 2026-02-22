#!/usr/bin/env bash
set -exuo pipefail

if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: meta/docker/build.sh <image-name> <builds-tsv>"
  echo "  <builds-tsv> is newline-delimited, tab-separated lines of: triple host target"
  exit 1
fi
IMAGE="$1"
QUICKJS_BUILDS="$2"

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  ./prebuild.sh
  ./build-image.sh "$IMAGE"
  ./run-build-cmd.sh "$IMAGE" "$QUICKJS_BUILDS"
popd > /dev/null
