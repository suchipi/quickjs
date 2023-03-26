# Dockerfile for: suchipi/quickjs-builder:linux-musl
FROM alpine:3.17.2

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

# Make normal user
RUN addgroup -g $GID user || true
RUN adduser -s /bin/sh -u $UID -D -G user user
RUN echo "user ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER user

# The intent is that you volume-mount the repo into /opt/quickjs.
WORKDIR /opt/quickjs
CMD /opt/quickjs/meta/docker/linux-musl/cmd.sh
