#!/usr/bin/env bash
set -ex

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./ROOT_DIR.sh
popd > /dev/null

pushd "$ROOT_DIR" > /dev/null
  # ensure node_modules are installed
  NODE_VERSION=$(cat .node-version)
  if [ ! -d node_modules ]; then
    docker run --rm \
      -v $ROOT_DIR:/workdir \
      -w /workdir \
      node:${NODE_VERSION/v/} \
        npm install
  fi
popd > /dev/null
