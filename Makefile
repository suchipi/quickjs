ifndef VARIANT
	ifeq ($(shell uname -s),Darwin)
		VARIANT=darwin
	else
		VARIANT=linux
	endif
endif

all: link
	tup --no-environ-check build-$(VARIANT)

link:
	ln -sf build-$(VARIANT) build

test: link
	./tests/run_all.sh

# If you can't use fuse or are having trouble getting it working,
# you can use this instead of 'all'.
#
# Do note, though, that this will build *everything* each run, rather than only
# the changed stuff.
all-nofuse: link
	tup generate --config configs/$(VARIANT).config build.sh && ./build.sh
