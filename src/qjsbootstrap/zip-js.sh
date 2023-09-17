#!/usr/bin/env bash

set -euo pipefail

HERE="$PWD"

WORKDIR=`mktemp -d`
trap 'rm -rf "$WORKDIR"' EXIT

SCRIPT_FILE=`realpath "$1"`
OUTPUT_ZIP_FILE="$2"

cp "$SCRIPT_FILE" "$WORKDIR/main.js"
cd "$WORKDIR"
zip archive.zip main.js
mv archive.zip "$HERE/$OUTPUT_ZIP_FILE"
