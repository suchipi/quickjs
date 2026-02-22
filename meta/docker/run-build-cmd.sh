#!/usr/bin/env bash
set -exuo pipefail

if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: meta/docker/run-build-cmd.sh <image-name> <builds-tsv>"
  echo "  <builds-tsv> is newline-delimited, tab-separated lines of: triple host target"
  exit 1
fi
IMAGE="$1"
QUICKJS_BUILDS="$2"

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  source ./ROOT_DIR.sh
popd > /dev/null

docker run --rm \
  -v $ROOT_DIR:/opt/quickjs \
  -e QUICKJS_EXTRAS=1 \
  -e QUICKJS_BUILDS="$QUICKJS_BUILDS" \
  "suchipi/quickjs-builder-${IMAGE}" \
    "/opt/quickjs/meta/docker/$IMAGE/cmd.sh"
