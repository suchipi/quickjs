FROM --platform=x86_64 alpine:3.17.2

RUN apk add \
  sudo \
  git \
  bash \
  build-base \
  gcc \
  ninja \
  nodejs \
  npm

ARG UID=1000
ARG GID=1000

# If there's no group with id $GID, create one (named 'user').
RUN if ! getent group $GID; then addgroup -g $GID user; fi

# If there's no user with id $UID, create one (named 'user').
RUN if ! id $UID; then \
    GROUP_NAME="$(id -gn $GID)" adduser -s /bin/sh -u $UID -D -G $GROUP_NAME user; \
  fi

# Allow user with id $UID to use sudo with no password prompt.
RUN USER_NAME="$(id -un $UID)" echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER $UID

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs

# Silence volume ownership warnings caused by Docker Desktop nonsense
RUN git config --global --add safe.directory /opt/quickjs