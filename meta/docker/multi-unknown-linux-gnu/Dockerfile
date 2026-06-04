FROM node:22.15.0 AS node

FROM ubuntu:20.04

COPY --from=node /usr/local /usr/local

RUN apt-get update && \
  apt-get install -y \
    sudo \
    build-essential \
    git \
    ninja-build

# Depending on the docker host arch, one of these will be available
# and the other one won't be. So we use `|| true` to ignore failure
# from the command.
RUN apt-get install -y gcc-aarch64-linux-gnu || true
RUN apt-get install -y gcc-x86-64-linux-gnu || true

ARG UID=1000
ARG GID=1000

# If there's no group with id $GID, create one (named 'user').
RUN if ! getent group $GID; then groupadd -g $GID user; fi

# If there's no user with id $UID, create one (named 'user').
RUN if ! id $UID; then useradd -m -s /bin/bash -u $UID -g $GID user; fi

# Allow user with id $UID to use sudo with no password prompt.
RUN USER_NAME="$(id -un $UID)" && echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER $UID

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs

# Silence volume ownership warnings caused by Docker Desktop nonsense
RUN git config --global --add safe.directory /opt/quickjs
