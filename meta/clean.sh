#!/usr/bin/env bash
set -euo pipefail

git clean -dfX -e '!.claude/settings.local.json' -e '!.tmp/'
