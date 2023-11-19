// Target: arm64 darwin

declare("CC_TARGET", "arm64-apple-darwin20.4-clang");
declare("AR_TARGET", "arm64-apple-darwin20.4-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
