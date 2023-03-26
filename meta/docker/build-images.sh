#!/usr/bin/env bash
set -ex

# defines IMAGES
source meta/docker/images.sh

pushd meta/docker > /dev/null
  for DIR in "${IMAGES[@]}"; do
    pushd "$DIR" > /dev/null
      docker build \
        --build-arg UID=$(id -u) \
        --build-arg GID=$(id -g) \
        --build-arg IMAGE_DIR="$DIR" \
        -t "suchipi/quickjs-builder-${DIR}" \
        .
    popd > /dev/null
  done
popd > /dev/null
