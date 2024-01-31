#!/usr/bin/env bash
set -e

if [[ "$(uname)" == "Darwin" ]]; then
  brew install ninja
  # install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
elif [[ "$(uname)" == "Linux" ]]; then
  sudo apt-get install -y ninja-build
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install
nvm use

set -x

env QUICKJS_EXTRAS=1 meta/build.sh
npm test
