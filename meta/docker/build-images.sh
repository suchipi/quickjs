#!/usr/bin/env bash
set -ex

# feel free to comment stuff out
DIRS=(
  most
  linux-musl
)

pushd meta/docker > /dev/null
  for DIR in "${DIRS[@]}"; do
    pushd "$DIR" > /dev/null
      docker build \
        --build-arg UID=$(id -u) \
        --build-arg GID=$(id -g) \
        -t "suchipi/quickjs-builder-${DIR}" \
        .
    popd > /dev/null
  done
popd > /dev/null
