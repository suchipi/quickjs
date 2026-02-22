#!/usr/bin/env bash
set -exuo pipefail

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./ROOT_DIR.sh
popd > /dev/null

pushd "$ROOT_DIR" > /dev/null
  meta/clean.sh
  meta/docker/prebuild.sh

  # Group triples by image, then build each image with its triples
  declare -A IMAGE_BUILDS

  while IFS=$'\t' read -r TRIPLE IMAGE HOST TARGET; do
    if [[ -n "${IMAGE_BUILDS[$IMAGE]:-}" ]]; then
      IMAGE_BUILDS[$IMAGE]+=$'\n'
    fi
    IMAGE_BUILDS[$IMAGE]+="${TRIPLE}"$'\t'"${HOST}"$'\t'"${TARGET}"
  done < meta/docker/triples.tsv

  for IMAGE in "${!IMAGE_BUILDS[@]}"; do
    meta/docker/build.sh "$IMAGE" "${IMAGE_BUILDS[$IMAGE]}"
  done

  cp -r build/*/dts build/
  rm -rf build/*/dts
popd > /dev/null
