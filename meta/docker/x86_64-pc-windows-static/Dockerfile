FROM oven/bun:1.0.0 as bun

FROM ubuntu:20.04

COPY --from=bun /usr/local /usr/local

RUN apt-get update && \
  apt-get install -y \
    sudo \
    build-essential \
    git \
    gcc-mingw-w64-x86-64 \
    ninja-build

ARG UID=1000
ARG GID=1000

# Make normal user

# if group with that GID already exists, use it (macOS ubuntu image on at least
# orbstack has group staff with gid 20, which matches a macOS user's group. Not
# sure if Docker Desktop does that)
RUN if ! getent group $GID; then groupadd -g $GID user; fi

RUN useradd -m -s /bin/bash -u $UID -g $GID user

# allow user to use sudo with no password prompt
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER user

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs
