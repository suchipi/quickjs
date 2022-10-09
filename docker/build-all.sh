#!/usr/bin/env bash
set -ex

# Move to repo root
cd $(git rev-parse --show-toplevel)

./docker/build-images.sh

rm -rf ./docker/artifacts/*

for VARIANT in darwin-from-linux darwin-arm-from-linux linux-from-linux windows-from-linux; do
  mkdir -p ./docker/artifacts/$VARIANT
  ./docker/run-image.sh $VARIANT bash -c 'shopt -s globstar && make && mv ./src/**/*.{target,target.*} ./docker/artifacts/'"$VARIANT"
done
