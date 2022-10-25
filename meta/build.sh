#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname)" == "Darwin" ]]; then
    HOST_OS="darwin"
else
    HOST_OS="linux"
fi
if [[ "${HOST:-}" == "" ]]; then
  HOST="$HOST_OS"  
fi
if [[ "${TARGET:-}" == "" ]]; then
  TARGET="$HOST_OS"  
fi

echo "HOST: $HOST"
echo "TARGET: $TARGET"

if command -v tup &> /dev/null; then
  source "meta/envs/host/$HOST.env"
  source "meta/envs/target/$TARGET.env"
  DEFAULT_CMD=tup
else
  DEFAULT_CMD="meta/buildscripts/$TARGET-from-$HOST.sh"
fi

"${@:-$DEFAULT_CMD}"
