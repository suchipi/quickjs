#!/usr/bin/env bash
set -exuo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: meta/docker/build-image.sh <image-name>"
  echo "  (where <image-name> is the name of one of the subdirectories of"
  echo "  meta/docker)"
  echo "Example: meta/docker/build-image.sh multi-apple-darwin"
  exit 1
fi
IMAGE="$1"

pushd "$(dirname "$BASH_SOURCE")/$IMAGE" > /dev/null
  docker build \
    --build-arg UID=$(id -u) \
    --build-arg GID=$(id -g) \
    -t "suchipi/quickjs-builder-${IMAGE}" \
    .
popd > /dev/null
