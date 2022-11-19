// Target: arm64 darwin
declare("CC_TARGET", "arm64-apple-darwin20.4-clang");
declare("AR_TARGET", "arm64-apple-darwin20.4-ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDFLAGS_TARGET", "-rdynamic");
declare("LIBS_TARGET", "-ldl -lpthread");
declare(
  "CFLAGS_TARGET",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC"
);
