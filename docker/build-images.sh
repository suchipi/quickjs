#!/usr/bin/env bash
set -e

# Move to repo root
cd $(git rev-parse --show-toplevel)

cd docker

docker build -t suchipi/quickjs-build:linux -f ./Dockerfile.build-linux .
docker build -t suchipi/quickjs-build:windows -f ./Dockerfile.build-windows .
docker build -t suchipi/quickjs-build:darwin -f ./Dockerfile.build-darwin .
