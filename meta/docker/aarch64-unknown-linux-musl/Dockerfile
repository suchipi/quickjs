FROM oven/bun:1.0.0 as bun
FROM --platform=aarch64 alpine:3.17.2

COPY --from=bun /usr/local /usr/local

RUN apk add \
  sudo \
  git \
  bash \
  build-base \
  gcc \
  ninja

ARG UID=1000
ARG GID=1000

# Make normal user

# if group with that GID already exists, use it (macOS ubuntu image on at least
# orbstack has group staff with gid 20, which matches a macOS user's group. Not
# sure if Docker Desktop does that)
RUN if ! getent group $GID; then addgroup -g $GID user; fi

# group name could vary since group with that id might already exist
RUN GROUP_NAME=$(getent group $GID | cut -d: -f1) && \
  adduser -s /bin/sh -u $UID -D -G $GROUP_NAME user

# allow user to use sudo with no password prompt
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER user

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs
