#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar

DIM="\033[2m"
RESET="\033[22m"

if [[ "${1:-}" == "--help" ]]; then
  printf "Usage:\n"
  printf "  meta/build.sh $DIM# build for current platform$RESET\n"
  printf "  meta/build.sh --targets $DIM# list available targets$RESET\n"
  printf "  meta/build.sh <target> $DIM# use docker to build for a given target$RESET\n"
  printf "  meta/build.sh all $DIM# use docker to build all targets$RESET\n"
  printf "  env HOST=\"...\" TARGET=\"...\" meta/build.sh $DIM# build using specific meta/ninja/envs files (advanced)$RESET\n"
  exit 2
elif [[ "${1:-}" == "--targets" ]]; then
  node -e '
    console.log(
      Object.keys(
        JSON.parse(
          fs.readFileSync("./meta/docker/targets.json", "utf-8")
        )
      ).sort().join("\n")
    )'
elif [[ "${1:-}" != "all" ]]; then
  meta/docker/build-all.sh
elif [[ "${1:-}" != "" ]]; then
  TARGET="${1:-}"
  echo "Using docker to build for target $TARGET..."
  IMAGE="$(node -e '
    console.log(
      JSON.parse(
        fs.readFileSync(
          "./meta/docker/targets.json",
          "utf-8"
        )
      )
      ["'"$TARGET"'"]
    )
  ')"
  meta/docker/build.sh "$IMAGE"
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
