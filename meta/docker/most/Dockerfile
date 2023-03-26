# Dockerfile for: suchipi/quickjs-builder:most
FROM node:18-bullseye as node
FROM crazymax/osxcross:11.3-r7-ubuntu AS osxcross

FROM ubuntu:20.04

COPY --from=node /usr/local /usr/local
COPY --from=osxcross /osxcross /osxcross

RUN apt-get update && \
  apt-get install -y \
    sudo \
    build-essential \
    git \
    gcc-mingw-w64-x86-64 \
    clang \
    lld \
    libc6-dev \
    ninja-build

# Depending on the docker host arch, one of these will be available
# and the other one won't be. So we use `|| true` to ignore failure
# from the command.
RUN apt-get install -y gcc-aarch64-linux-gnu || true
RUN apt-get install -y gcc-x86-64-linux-gnu || true

ARG UID=1000
ARG GID=1000

# Make normal user
RUN groupadd -g $GID user || true
RUN useradd -m -s /bin/bash -u $UID -g $GID user
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER user

ENV PATH="/osxcross/bin:$PATH"
ENV LD_LIBRARY_PATH="/osxcross/lib:$LD_LIBRARY_PATH"

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs
CMD /opt/quickjs/meta/docker/most/cmd.sh
