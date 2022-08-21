#!/usr/bin/env bash
set -e

# Move to repo root
cd $(git rev-parse --show-toplevel)

cd docker

docker build -t suchipi/quickjs-build:linux-from-linux -f ./Dockerfile.build-linux .
docker build -t suchipi/quickjs-build:windows-from-linux -f ./Dockerfile.build-windows .
docker build -t suchipi/quickjs-build:darwin-from-linux -f ./Dockerfile.build-darwin .
docker build -t suchipi/quickjs-build:darwin-arm-from-linux -f ./Dockerfile.build-darwin-arm .
