#!/usr/bin/env bash
set -exuo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: meta/docker/build.sh <image-name>"
  echo "  (where <image-name> is the name of one of the subdirectories of"
  echo "  meta/docker)"
  echo "Example: meta/docker/build.sh x86_64-pc-windows-static"
  exit 1
fi
IMAGE="$1"

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  ./prebuild.sh
  ./build-image.sh "$IMAGE"
  ./run-build-cmd.sh "$IMAGE"
popd > /dev/null
