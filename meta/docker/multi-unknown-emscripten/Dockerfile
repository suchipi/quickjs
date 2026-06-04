FROM node:22.15.0 AS node
FROM emscripten/emsdk:3.1.74

COPY --from=node /usr/local /usr/local

RUN apt-get update && \
  apt-get install -y \
    sudo \
    git \
    ninja-build

ARG UID=1000
ARG GID=1000

# Ensure normal user and group. We only care about the UID and GID matching for
# docker volume purposes (as it's inconvenient if the container creates files
# the outer user cannot delete without sudo), so we re-use an existing
# user/group with matching uid/gid, if present.

# If there's no group with id $GID, create one (named 'user').
RUN if ! getent group $GID; then groupadd -g $GID user; fi

# If there's no user with id $UID, create one (named 'user').
RUN if ! id $UID; then useradd -m -s /bin/bash -u $UID -g $GID user; fi

# allow user to use sudo with no password prompt.
RUN USER_NAME="$(id -un $UID)" && echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER $UID

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs

# Silence volume ownership warnings caused by Docker Desktop nonsense
RUN git config --global --add safe.directory /opt/quickjs
