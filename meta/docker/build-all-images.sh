#!/usr/bin/env bash
set -exuo pipefail

cd $(dirname "$BASH_SOURCE")

for IMAGE in $(cut -f2 ./triples.tsv | sort -u); do
  ./build-image.sh "$IMAGE"
done
