#!/usr/bin/env bash
set -exuo pipefail

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./ROOT_DIR.sh
popd > /dev/null

pushd "$ROOT_DIR" > /dev/null
  meta/clean.sh
  meta/docker/prebuild.sh

  source meta/docker/IMAGES.sh
  for IMAGE in "${IMAGES[@]}"; do
    meta/docker/build.sh "$IMAGE"
  done

  cp -r build/*/dts build/
  rm -rf build/*/dts
popd > /dev/null
