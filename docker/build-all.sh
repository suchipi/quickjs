#!/usr/bin/env bash
set -ex

# Move to repo root
cd $(git rev-parse --show-toplevel)

./docker/build-images.sh

for VARIANT in darwin darwin-arm linux windows; do
  mkdir -p ./docker/artifacts/$VARIANT
  ./docker/run-image.sh $VARIANT bash -c 'make && mv ./src/**/*.{target,target.*} ./docker/artifacts/'"$VARIANT"
done
