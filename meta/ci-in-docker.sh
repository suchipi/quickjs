#!/usr/bin/env bash
set -exuo pipefail

# Runs meta/ci.sh inside a Docker container similar to GitHub Actions' ubuntu-latest.
# Usage: meta/ci-in-docker.sh

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./docker/ROOT_DIR.sh
  pushd ./docker/imitation-ci-image > /dev/null
    docker build \
      -t "suchipi/quickjs-imitation-ci-image" \
      .
  popd > /dev/null
popd > /dev/null


# temporary volume for node_modules
VOLUME_NAME="quickjs-ci-linux-node-modules"
docker volume create "$VOLUME_NAME" > /dev/null

cleanup() {
  docker volume rm "$VOLUME_NAME" > /dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm \
  -v "$ROOT_DIR":/opt/quickjs \
  -v "$VOLUME_NAME":/opt/quickjs/node_modules \
  -w /opt/quickjs \
  -e CI=true \
  suchipi/quickjs-imitation-ci-image \
  meta/ci.sh
