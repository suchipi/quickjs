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
# have to unset "e" when sourcing nvm in macOS due to weird issue described
# here: https://github.com/nvm-sh/nvm/issues/1985#issuecomment-456022013
set +e
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
set -e

nvm install
nvm use

set -x

env QUICKJS_EXTRAS=1 meta/build.sh
npm test
