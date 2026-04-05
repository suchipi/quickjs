// Target: aarch64 freebsd (cross-compiled from linux using clang)
declare("CC_TARGET", "freebsd-cc-aarch64");
declare("AR_TARGET", "llvm-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("LDFLAGS_TARGET", "-fuse-ld=lld");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-fuse-ld=lld");
