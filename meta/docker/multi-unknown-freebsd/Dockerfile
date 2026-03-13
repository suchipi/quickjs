FROM node:22.15.0 AS node

FROM debian:trixie-slim

COPY --from=node /usr/local /usr/local

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
    sudo \
    build-essential \
    git \
    ninja-build \
    clang \
    lld \
    llvm \
    curl \
    ca-certificates \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Download FreeBSD base systems for cross-compilation sysroots
ARG FREEBSD_RELEASE=15.0
ENV FREEBSD_RELEASE=${FREEBSD_RELEASE}

ENV FREEBSD_SYSROOT_X86_64=/freebsd-sysroot-x86_64
RUN mkdir -p ${FREEBSD_SYSROOT_X86_64} && \
    ( curl -fSL "https://download.freebsd.org/releases/amd64/amd64/${FREEBSD_RELEASE}-RELEASE/base.txz" \
        -o /tmp/base-x86_64.txz || \
      curl -fSL "https://archive.freebsd.org/old-releases/amd64/amd64/${FREEBSD_RELEASE}-RELEASE/base.txz" \
        -o /tmp/base-x86_64.txz ) && \
    tar -xJf /tmp/base-x86_64.txz -C ${FREEBSD_SYSROOT_X86_64} \
      ./usr/include \
      ./usr/lib \
      ./lib && \
    rm /tmp/base-x86_64.txz

ENV FREEBSD_SYSROOT_AARCH64=/freebsd-sysroot-aarch64
RUN mkdir -p ${FREEBSD_SYSROOT_AARCH64} && \
    ( curl -fSL "https://download.freebsd.org/releases/arm64/aarch64/${FREEBSD_RELEASE}-RELEASE/base.txz" \
        -o /tmp/base-aarch64.txz || \
      curl -fSL "https://archive.freebsd.org/old-releases/arm64/aarch64/${FREEBSD_RELEASE}-RELEASE/base.txz" \
        -o /tmp/base-aarch64.txz ) && \
    tar -xJf /tmp/base-aarch64.txz -C ${FREEBSD_SYSROOT_AARCH64} \
      ./usr/include \
      ./usr/lib \
      ./lib && \
    rm /tmp/base-aarch64.txz

# Add cross-compiler wrapper scripts
COPY freebsd-cc-x86_64 freebsd-cc-aarch64 /usr/local/bin/

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

# Silence volume ownership warnings caused by Docker Desktop nonsense
RUN git config --global --add safe.directory /opt/quickjs
