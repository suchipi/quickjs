ifndef VARIANT
	ifeq ($(shell uname -s),Darwin)
		VARIANT=darwin-from-darwin
	else
		VARIANT=linux-from-linux
	endif
endif

.PHONY: all tup test update-buildscripts clean link-build-to-variant link-build-to-root

# Targets to be invoked directly

all: link-build-to-root
	rm -f ./build && ln -sf . build && ./buildscripts/build-$(VARIANT).sh

tup: link-build-to-variant .tup
	tup --no-environ-check build-$(VARIANT)

test: link-build-to-variant
	./tests/run_all.sh

update-buildscripts: .tup
	rm -rf buildscripts/*.sh && \
	  tup generate --config ./configs/darwin-from-linux.config ./buildscripts/build-darwin-from-linux.sh && \
		tup generate --config ./configs/darwin-arm-from-linux.config ./buildscripts/build-darwin-arm-from-linux.sh && \
		tup generate --config ./configs/darwin-from-darwin.config ./buildscripts/build-darwin-from-darwin.sh && \
		tup generate --config ./configs/linux-from-linux.config ./buildscripts/build-linux-from-linux.sh && \
		tup generate --config ./configs/windows-from-linux.config ./buildscripts/build-windows-from-linux.sh && \
		sed -i 's/sh -e/sh -ex/' ./buildscripts/build-*.sh

# Targets you probably won't invoke directly

clean:
	git clean -dfX

link-build-to-variant:
	rm -f ./build && ln -sf build-$(VARIANT) build

link-build-to-root:
	rm -f ./build && ln -sf . build

.tup:
	tup init
