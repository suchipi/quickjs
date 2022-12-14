// Target: darwin (same arch as host)

declare("CC_TARGET", "clang");
declare("AR_TARGET", "ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDFLAGS_TARGET", "-rdynamic");
declare(
  "CFLAGS_TARGET",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC -Wno-implicit-int-float-conversion"
);
