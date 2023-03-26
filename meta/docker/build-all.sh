#!/usr/bin/env bash
set -ex

meta/clean.sh
npm install

# defines IMAGES
source meta/docker/images.sh

meta/docker/build-images.sh

for DIR in "${IMAGES[@]}"; do
  docker run --rm \
  -v $PWD:/opt/quickjs \
  "suchipi/quickjs-builder-${DIR}" \
  "/opt/quickjs/meta/docker/$DIR/cmd.sh"
done
