#!/usr/bin/env bash
set -ex

# move to root dir
cd $(dirname "$BASH_SOURCE")
cd ../..

meta/clean.sh

BUN_VERSION=$(cat .bun-version)
docker run --rm -it -v $PWD:/workdir -w /workdir oven/bun:${BUN_VERSION/v/} \
  bun install

# defines IMAGES
source meta/docker/images.sh

meta/docker/build-images.sh

for DIR in "${IMAGES[@]}"; do
  docker run --rm \
  -v $PWD:/opt/quickjs \
  -e QUICKJS_EXTRAS=1 \
  "suchipi/quickjs-builder-${DIR}" \
  "/opt/quickjs/meta/docker/$DIR/cmd.sh"
done
