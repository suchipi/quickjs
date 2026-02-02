#!/usr/bin/env bash
set -ex

if [ -z "${1:-}" ]; then
  echo "Usage: meta/docker/run-build.sh <image-name>"
  echo "Example: meta/docker/run-build.sh x86_64-pc-windows-static"
  exit 1
fi

DIR="$1"

# move to root dir
cd $(dirname "$BASH_SOURCE")
cd ../..

NODE_VERSION=$(cat .node-version)
HEREDIR="$PWD"
if command -v cygpath >/dev/null 2>&1; then
  HEREDIR="$(cygpath -m "$PWD")"
  export MSYS2_ARG_CONV_EXCL="*"
fi

# ensure node_modules are installed
if [ ! -d node_modules ]; then
  docker run --rm -it -v $HEREDIR:/workdir -w /workdir node:${NODE_VERSION/v/} \
    npm install
fi

# build the docker image if needed
pushd meta/docker > /dev/null
  pushd "$DIR" > /dev/null
    docker build \
      --build-arg UID=$(id -u) \
      --build-arg GID=$(id -g) \
      -t "suchipi/quickjs-builder-${DIR}" \
      .
  popd > /dev/null
popd > /dev/null

# run the build
docker run --rm \
  -v $HEREDIR:/opt/quickjs \
  -e QUICKJS_EXTRAS=1 \
  "suchipi/quickjs-builder-${DIR}" \
  "/opt/quickjs/meta/docker/$DIR/cmd.sh"
