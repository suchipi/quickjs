#!/usr/bin/env bash

# gcc x86_64 cross-compiler insists on looking for libs in the wrong place...
sudo mkdir -p /usr/lib/x86_64-linux-gnu
for FILE in /usr/x86_64-linux-gnu/lib/*; do
  sudo cp $FILE /usr/lib/x86_64-linux-gnu
done
