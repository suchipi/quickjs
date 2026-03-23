// Target: arm64 darwin

declare("CC_TARGET", "arm64-apple-darwin20.4-clang");
declare("AR_TARGET", "arm64-apple-darwin20.4-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
// arm64 Macs only exist on macOS 11+
declareOrAppend("CFLAGS_TARGET", "-mmacosx-version-min=11.0");
declareOrAppend("LDFLAGS_TARGET", "-mmacosx-version-min=11.0");
