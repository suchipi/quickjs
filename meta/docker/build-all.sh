#!/usr/bin/env bash
set -ex

meta/clean.sh

# feel free to comment stuff out
DIRS=(
  most
  linux-musl
)

meta/docker/build-images.sh

for DIR in "${DIRS[@]}"; do
  docker run --rm \
  -v $PWD:/opt/quickjs \
  "suchipi/quickjs-builder-${DIR}"
done
