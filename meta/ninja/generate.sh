#!/usr/bin/env bash

set -euo pipefail

if [[ "${HOST:-}" == "" ]]; then
  echo "You must define the HOST env var"
  exit 1
fi

if [[ "${TARGET:-}" == "" ]]; then
  echo "You must define the TARGET env var"
  exit 1
fi

npx shinobi \
  "meta/ninja/envs/host/$HOST.ninja.js" \
  "meta/ninja/envs/target/$TARGET.ninja.js" \
  meta/ninja/defs.ninja.js \
  meta/ninja/rules.ninja.js \
  "$@" \
> build.ninja
