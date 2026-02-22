#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar

DIM="\033[2m"
RESET="\033[22m"

if [[ "${1:-}" == "--help" ]]; then
  printf "Usage:\n"
  printf "  meta/build.sh $DIM# build for current platform$RESET\n"
  printf "  meta/build.sh --platforms $DIM# list available platforms$RESET\n"
  printf "  meta/build.sh <platform> $DIM# use docker to build for a given platform$RESET\n"
  printf "  meta/build.sh all $DIM# use docker to build all platforms$RESET\n"
  printf "  env HOST=\"...\" TARGET=\"...\" meta/build.sh $DIM# build using specific meta/ninja/envs files (advanced)$RESET\n"
elif [[ "${1:-}" == "--platforms" ]]; then
  cut -f1 ./meta/docker/triples.tsv | sort
elif [[ "${1:-}" == "all" ]]; then
  meta/docker/build-all.sh
elif [[ "${1:-}" != "" ]]; then
  TRIPLE="${1:-}"
  echo "Using docker to build for platform $TRIPLE..."
  if ! LINE="$(grep "^${TRIPLE}"$'\t' ./meta/docker/triples.tsv)"; then
    echo "Unknown platform: $TRIPLE" >&2
    echo "Available platforms:" >&2
    cut -f1 ./meta/docker/triples.tsv | sort >&2
    exit 1
  fi
  IFS=$'\t' read -r _ IMAGE HOST TARGET <<< "$LINE"
  meta/docker/build.sh "$IMAGE" "${TRIPLE}"$'\t'"${HOST}"$'\t'"${TARGET}"
else
  # normal build
  if [[ "$(uname)" == "Darwin" ]]; then
    HOST_OS="darwin"
  elif [[ "$(uname)" == "FreeBSD" ]]; then
    HOST_OS="freebsd"
  elif [[ "$(uname)" == "Linux" ]]; then
    HOST_OS="linux"
  elif [[ "$MSYSTEM" != "" ]]; then
    HOST_OS="msys2"
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

  if [[ "${SKIP_NPM_INSTALL:-}" == "" ]]; then
    npm install
  fi

  meta/ninja/generate.js src/**/*.ninja.js
  ninja
fi
