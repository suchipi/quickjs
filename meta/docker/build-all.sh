#!/usr/bin/env bash
set -ex

# move to root dir
cd $(dirname "$BASH_SOURCE")
cd ../..

# meta/clean.sh

# NODE_VERSION=$(cat .node-version)
# docker run --rm -it -v $PWD:/workdir -w /workdir node:${NODE_VERSION/v/} \
#   npm install

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

cp -r build/*/dts build/
rm -rf build/*/dts
