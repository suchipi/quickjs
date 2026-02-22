#!/usr/bin/env bash
set -euo pipefail

git clean -dfX

if [[ "$QUICKJS_BUILD_DOCS" == "1" ]]; then
  echo 'Removing meta/docs/*'
  rm -rf meta/docs/{,.}*
fi
