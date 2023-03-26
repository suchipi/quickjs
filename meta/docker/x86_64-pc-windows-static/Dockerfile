FROM node:18-bullseye as node

FROM ubuntu:20.04

COPY --from=node /usr/local /usr/local

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
RUN groupadd -g $GID user || true
RUN useradd -m -s /bin/bash -u $UID -g $GID user
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER user

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs
