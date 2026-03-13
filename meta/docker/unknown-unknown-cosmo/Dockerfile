FROM node:22.15.0 AS node

FROM debian:trixie-slim

COPY --from=node /usr/local /usr/local

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
    sudo \
    build-essential \
    git \
    ninja-build \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Download and install cosmocc toolchain
ARG COSMOCC_VERSION=4.0.2
RUN curl -fSL "https://cosmo.zip/pub/cosmocc/cosmocc-${COSMOCC_VERSION}.zip" \
      -o /tmp/cosmocc.zip && \
    mkdir -p /opt/cosmocc && \
    unzip -q /tmp/cosmocc.zip -d /opt/cosmocc && \
    rm /tmp/cosmocc.zip

ENV PATH="/opt/cosmocc/bin:${PATH}"

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
