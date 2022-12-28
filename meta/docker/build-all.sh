#!/usr/bin/env bash
set -ex

./meta/docker/build-image.sh

docker run --rm \
  -v $PWD:/opt/quickjs \
  suchipi/quickjs-builder
