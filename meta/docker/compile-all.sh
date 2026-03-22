#!/usr/bin/env bash
set -exuo pipefail

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./ROOT_DIR.sh
popd > /dev/null

pushd "$ROOT_DIR" > /dev/null
  meta/clean.sh
  meta/docker/precompile.sh

  readarray -t ALL_TRIPLES < <(cut -f1 meta/docker/triples.tsv)
  meta/docker/compile-triples.sh "${ALL_TRIPLES[@]}"

  cp -r build/*/dts build/
  rm -rf build/*/dts
popd > /dev/null
