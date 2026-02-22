pushd "$(dirname "$BASH_SOURCE")/../.." > /dev/null
  ROOT_DIR="$PWD"
  if command -v cygpath >/dev/null 2>&1; then
    ROOT_DIR="$(cygpath -m "$PWD")"
    export MSYS2_ARG_CONV_EXCL="*"
  fi
popd > /dev/null
