FROM node:22.15.0 AS node
FROM crazymax/osxcross:11.3-r7-ubuntu AS osxcross

FROM ubuntu:20.04

COPY --from=node /usr/local /usr/local
COPY --from=osxcross /osxcross /osxcross

RUN apt-get update && \
  apt-get install -y \
    sudo \
    build-essential \
    git \
    clang \
    lld \
    libc6-dev \
    ninja-build

ARG UID=1000
ARG GID=1000

# If there's no group with id $GID, create one (named 'user').
RUN if ! getent group $GID; then groupadd -g $GID user; fi

# If there's no user with id $UID, create one (named 'user').
RUN if ! id $UID; then useradd -m -s /bin/bash -u $UID -g $GID user; fi

# Allow user with id $UID to use sudo with no password prompt.
RUN USER_NAME="$(id -un $UID)" && echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER $UID

ENV PATH="/osxcross/bin:$PATH"
ENV LD_LIBRARY_PATH="/osxcross/lib:$LD_LIBRARY_PATH"
ENV MACOSX_DEPLOYMENT_TARGET=10.13

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs

# Silence volume ownership warnings caused by Docker Desktop nonsense
RUN git config --global --add safe.directory /opt/quickjs
