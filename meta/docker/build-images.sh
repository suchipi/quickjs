#!/usr/bin/env bash
set -exuo pipefail

cd $(dirname "$BASH_SOURCE")

source ./IMAGES.sh
for DIR in "${IMAGES[@]}"; do
  ./build-image.sh "$DIR"
done
