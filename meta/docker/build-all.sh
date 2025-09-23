#!/usr/bin/env bash
set -ex

# move to root dir
cd $(dirname "$BASH_SOURCE")
cd ../..

meta/clean.sh

NODE_VERSION=$(cat .node-version)
HEREDIR="$PWD"
if command -v cygpath >/dev/null 2>&1; then
  HEREDIR="$(cygpath -m "$PWD")"
  export MSYS2_ARG_CONV_EXCL="*"
fi

docker run --rm -it -v $HEREDIR:/workdir -w /workdir node:${NODE_VERSION/v/} \
  npm install

# defines IMAGES
source meta/docker/images.sh

meta/docker/build-images.sh

for DIR in "${IMAGES[@]}"; do
  docker run --rm \
  -v $HEREDIR:/opt/quickjs \
  -e QUICKJS_EXTRAS=1 \
  "suchipi/quickjs-builder-${DIR}" \
  "/opt/quickjs/meta/docker/$DIR/cmd.sh"
done

cp -r build/*/dts build/
rm -rf build/*/dts
