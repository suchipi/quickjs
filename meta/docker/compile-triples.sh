#!/usr/bin/env bash
# Usage: compile-triples.sh TRIPLE [TRIPLE ...]
#
# Groups the given triples by Docker image (from triples.tsv), then calls
# compile.sh once per image. This avoids re-running multi-* images that
# build multiple architectures.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
TRIPLES_TSV="$SCRIPT_DIR/triples.tsv"

if [[ $# -eq 0 ]]; then
  echo "Usage: compile-triples.sh TRIPLE [TRIPLE ...]" >&2
  exit 1
fi

declare -A IMAGE_BUILDS

for TRIPLE in "$@"; do
  LINE="$(grep -F "${TRIPLE}"$'\t' "$TRIPLES_TSV")" || {
    echo "Unknown platform: $TRIPLE" >&2
    echo "Available platforms:" >&2
    cut -f1 "$TRIPLES_TSV" | sort >&2
    exit 1
  }
  IFS=$'\t' read -r _ IMAGE HOST TARGET <<< "$LINE"
  if [[ -n "${IMAGE_BUILDS[$IMAGE]:-}" ]]; then
    IMAGE_BUILDS[$IMAGE]+=$'\n'
  fi
  IMAGE_BUILDS[$IMAGE]+="${TRIPLE}"$'\t'"${HOST}"$'\t'"${TARGET}"
done

for IMAGE in "${!IMAGE_BUILDS[@]}"; do
  "$SCRIPT_DIR/compile.sh" "$IMAGE" "${IMAGE_BUILDS[$IMAGE]}"
done
