ifeq ($(shell uname -s),Darwin)
	VARIANT=darwin
else
	VARIANT=linux
endif

all:
	tup --no-environ-check build-$(VARIANT)

linux:
	tup --no-environ-check build-linux

darwin:
	tup --no-environ-check build-darwin
