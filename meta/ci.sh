#!/usr/bin/env bash
set -e

sudo apt install ninja-build

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

nvm install
nvm use

set -x

meta/build.sh
npm test
