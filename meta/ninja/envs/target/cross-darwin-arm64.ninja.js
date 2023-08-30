// Target: arm64 darwin
declare("CC_TARGET", "arm64-apple-darwin20.4-clang");
declare("AR_TARGET", "arm64-apple-darwin20.4-ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDEXPORT_TARGET", "-rdynamic");
declare(
  "CFLAGS_TARGET",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC -Wno-implicit-int-float-conversion"
);
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
