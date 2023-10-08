#!/usr/bin/env bash

cd $(dirname $(realpath $BASH_SOURCE))

../../build/extras/run-test262 -c ./test262.conf
