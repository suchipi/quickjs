#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar

if [[ "$(uname)" == "Darwin" ]]; then
  HOST_OS="darwin"
else
  HOST_OS="linux"
fi
if [[ "${HOST:-}" == "" ]]; then
  export HOST="$HOST_OS"
fi
if [[ "${TARGET:-}" == "" ]]; then
  export TARGET="$HOST_OS"
fi

echo "HOST: $HOST"
echo "TARGET: $TARGET"

if [[ "${SKIP_NPM_INSTALL:-}" == "" ]]; then
  npm install
fi

meta/ninja/generate.sh src/**/*.ninja.js
ninja
