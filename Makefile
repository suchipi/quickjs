ifeq ($(shell uname -s),Darwin)
	VARIANT=darwin
else
	VARIANT=linux
endif

all: link
	tup --no-environ-check build-$(VARIANT)

link:
	ln -sf build-$(VARIANT) build

test: link
	./tests/run_all.sh
