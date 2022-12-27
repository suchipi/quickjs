#!/usr/bin/env bash
set -ex

pushd meta/docker > /dev/null
docker build \
  --build-arg UID=$(id -u) \
  --build-arg GID=$(id -g) \
  -t suchipi/quickjs-builder \
  .
popd > /dev/null

docker run --rm \
  -v $PWD:/opt/quickjs \
  suchipi/quickjs-builder
