#!/usr/bin/env bash
set -e

if [[ -z "$1" ]]; then
  echo Please use the first command-line argument to this script to specify which image to run: 'linux', 'windows' or 'darwin'.
fi

REPO_ROOT=$(git rev-parse --show-toplevel)

docker run --rm -it -v ${REPO_ROOT}:/opt/quickjs suchipi/quickjs-build:$1
