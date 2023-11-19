// Target: x86_64 darwin

declare("CC_TARGET", "x86_64-apple-darwin20.4-clang");
declare("AR_TARGET", "x86_64-apple-darwin20.4-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
