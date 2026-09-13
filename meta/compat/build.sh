#!/usr/bin/env bash
set -euo pipefail

DIM="\033[2m"
RESET="\033[22m"

if [[ "${1:-}" == "--help" ]]; then
  printf "Usage:\n"
  printf "  meta/compat/build.sh $DIM# test build/bin/qjs and rebuild the tables$RESET\n"
  printf "  meta/compat/build.sh --engine <path> $DIM# test a different qjs binary$RESET\n"
  printf "  meta/compat/build.sh --suite es6,esnext $DIM# only re-run some suites$RESET\n"
  printf "  meta/compat/build.sh --html-only $DIM# re-render from the existing results.json$RESET\n"
  printf "\n"
  printf "Remaining options are passed to run-tests.js; see --help there for the full set.\n"
  exit 0
fi

cd "$(dirname "$0")/../.."

if [[ ! -f meta/compat/compat-table/build.js ]]; then
  echo "Fetching the compat-table submodule..."
  git submodule update --init meta/compat/compat-table
fi

if [[ ! -d meta/compat/compat-table/node_modules ]]; then
  echo "Installing compat-table's dependencies..."
  (cd meta/compat/compat-table && npm install --no-audit --no-fund)
fi

if [[ "${1:-}" == "--html-only" ]]; then
  shift
else
  node meta/compat/run-tests.js "$@"
fi

node meta/compat/build-html.js
