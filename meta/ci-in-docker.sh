#!/usr/bin/env bash
set -exuo pipefail

# Runs meta/ci.sh inside a Docker container similar to GitHub Actions' ubuntu-latest.
# Usage: meta/ci-in-docker.sh

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./docker/ROOT_DIR.sh
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
  ubuntu:22.04 \
  bash -c '
    set -exuo pipefail

    apt-get update
    apt-get install -y sudo curl git build-essential ninja-build

    # ci.sh expects nvm, so set up a minimal nvm environment
    export HOME=/root
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

    meta/ci.sh
  '
