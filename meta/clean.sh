#!/usr/bin/env bash
set -euo pipefail

git clean -dfX
rm -rf meta/docs/{,.}*
