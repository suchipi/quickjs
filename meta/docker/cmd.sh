#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar

git config --global --add safe.directory /opt/quickjs

for BUILD_SCRIPT in meta/buildscripts/*-from-linux.sh; do
    BUILD_SCRIPT_NAME=$(basename "$BUILD_SCRIPT")
    NAME_WITHOUT_SH=${BUILD_SCRIPT_NAME/.sh/}

    PARTS=(${NAME_WITHOUT_SH/-from-/ })
    export HOST=${PARTS[1]}
    export TARGET=${PARTS[0]}

    TARGET_WITHOUT_CROSS=${TARGET/cross-/}

    echo "----"
    echo "---- Building $TARGET_WITHOUT_CROSS (${BUILD_SCRIPT}) ----"
    echo "----"

    meta/clean.sh
    "$BUILD_SCRIPT"

    ARTIFACT_DIR="meta/artifacts/$TARGET_WITHOUT_CROSS"
    mkdir -p "$ARTIFACT_DIR"
    mv ./src/**/*.{target,target.*} "$ARTIFACT_DIR/"
done
