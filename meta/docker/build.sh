#!/usr/bin/env bash
set -exuo pipefail

if [ -z "${1:-}" ] || [[ "${1:-}" == "--help" ]]; then
  echo "Usage: meta/docker/build.sh <image-name> <builds-tsv>"
  echo "  <builds-tsv> is newline-delimited, tab-separated lines of: triple host target"
  echo "  If omitted, builds all triples for the associated image (by reading triples.tsv)."
  exit 1
fi
IMAGE="$1"

if [ -n "${2:-}" ]; then
  QUICKJS_BUILDS="$2"
else
  SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
  QUICKJS_BUILDS=""
  while IFS=$'\t' read -r TRIPLE IMG HOST TARGET; do
    if [[ "$IMG" == "$IMAGE" ]]; then
      if [[ -n "$QUICKJS_BUILDS" ]]; then
        QUICKJS_BUILDS+=$'\n'
      fi
      QUICKJS_BUILDS+="${TRIPLE}"$'\t'"${HOST}"$'\t'"${TARGET}"
    fi
  done < "$SCRIPT_DIR/triples.tsv"

  if [[ -z "$QUICKJS_BUILDS" ]]; then
    echo "No triples found for image: $IMAGE" >&2
    echo "Available images:" >&2
    cut -f2 "$SCRIPT_DIR/triples.tsv" | sort -u >&2
    exit 1
  fi
fi

pushd "$(dirname "$BASH_SOURCE")" > /dev/null
  ./prebuild.sh
  ./build-image.sh "$IMAGE"
  ./run-build-cmd.sh "$IMAGE" "$QUICKJS_BUILDS"
popd > /dev/null
