FROM ubuntu:22.04

RUN apt-get update && \
  apt-get install -y \
    sudo \
    curl \
    git \
    build-essential \
    ninja-build

# ci.sh expects nvm, so set up nvm
ENV HOME=/root
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
