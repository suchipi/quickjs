#!/usr/bin/env bash

if [[ ! "$PWD" == *utils/makeheaders ]]
then
  echo "Please run this script from within the utils/makeheaders directory."
  exit 1
fi

mkdir -p out
gcc ./src/makeheaders.c -o ./out/makeheaders
