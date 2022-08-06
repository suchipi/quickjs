ifndef VARIANT
	ifeq ($(shell uname -s),Darwin)
		VARIANT=darwin
	else
		VARIANT=linux
	endif
endif

.PHONY: all tup test update-buildscripts link-build-to-variant link-build-to-root

# Targets to be invoked directly

all: link-build-to-root
	rm -f ./build && ln -sf . build && ./buildscripts/build-$(VARIANT).sh

tup: link-build-to-variant .tup
	tup --no-environ-check build-$(VARIANT)

test: link-build-to-variant
	./tests/run_all.sh

update-buildscripts: .tup
	rm -rf buildscripts/*.sh && \
	  tup generate --config ./configs/darwin.config ./buildscripts/build-darwin.sh && \
		tup generate --config ./configs/linux.config ./buildscripts/build-linux.sh && \
		tup generate --config ./configs/windows.config ./buildscripts/build-windows.sh

# Targets you probably won't invoke directly

link-build-to-variant:
	rm -f ./build && ln -sf build-$(VARIANT) build

link-build-to-root:
	rm -f ./build && ln -sf . build

.tup:
	tup init

