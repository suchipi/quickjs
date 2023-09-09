#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar

if [[ "$(uname)" == "Darwin" ]]; then
  HOST_OS="darwin"
elif [[ "$(uname)" == "FreeBSD" ]]; then
  HOST_OS="freebsd"
elif [[ "$(uname)" == "Linux" ]]; then
  HOST_OS="linux"
else
  HOST_OS="other"
fi

if [[ "${HOST:-}" == "" ]]; then
  export HOST="$HOST_OS"
fi
if [[ "${TARGET:-}" == "" ]]; then
  export TARGET="$HOST_OS"
fi

echo "HOST: $HOST"
echo "TARGET: $TARGET"

if [[ "${SKIP_BUN_INSTALL:-}" == "" ]]; then
  bun install
fi

meta/ninja/generate.js src/**/*.ninja.js
ninja
