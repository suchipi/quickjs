#!/usr/bin/env bash
set -euo pipefail

meta/clean.sh

bash -c '\
  source meta/envs/host/linux.env && \
  source meta/envs/target/linux.env && \
  tup generate meta/buildscripts/linux-from-linux.sh'

bash -c '\
  source meta/envs/host/linux.env && \
  source meta/envs/target/cross-darwin-x86.env && \
  tup generate meta/buildscripts/cross-darwin-x86-from-linux.sh'

bash -c '\
  source meta/envs/host/linux.env && \
  source meta/envs/target/cross-darwin-arm.env && \
  tup generate meta/buildscripts/cross-darwin-arm-from-linux.sh'

bash -c '\
  source meta/envs/host/darwin.env && \
  source meta/envs/target/darwin.env && \
  tup generate meta/buildscripts/darwin-from-darwin.sh'

bash -c '\
  source meta/envs/host/linux.env && \
  source meta/envs/target/cross-windows.env && \
  tup generate meta/buildscripts/cross-windows-from-linux.sh'

if [[ "$(uname)" == "Darwin" ]]; then
  SED_INPLACE="sed -i '' 's/sh -e/sh -ex/'"
else
  SED_INPLACE="sed -i 's/sh -e/sh -ex/'"
fi

for script in ./meta/buildscripts/*.sh; do
  eval "$SED_INPLACE $script"
done
