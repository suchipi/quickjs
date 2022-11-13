// Target: x86_64 darwin
declare("CC_TARGET", "x86_64-apple-darwin20.4-clang");
declare("AR_TARGET", "x86_64-apple-darwin20.4-ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDFLAGS_HOST", "-rdynamic");
declare("LIBS_TARGET", "-ldl -lpthread");
declare(
  "CFLAGS_TARGET",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC"
);
