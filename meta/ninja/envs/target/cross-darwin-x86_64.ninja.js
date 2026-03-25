// Target: x86_64 darwin

declare("CC_TARGET", "x86_64-apple-darwin20.4-clang");
declare("AR_TARGET", "x86_64-apple-darwin20.4-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
declareOrAppend("CFLAGS_TARGET", "-mmacosx-version-min=10.13");
declareOrAppend("LDFLAGS_TARGET", "-mmacosx-version-min=10.13");

if (process.env.CONFIG_FETCH !== "0") {
  declareOrAppend("LIBS_TARGET", "-lcurl");
}
