// Target: darwin (same arch as host)

declare("CC_TARGET", "clang");
declare("AR_TARGET", "ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDFLAGS_TARGET", "-rdynamic");
declare("LIBS_TARGET", "-ldl -lpthread");
declare(
  "CFLAGS_TARGET",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC"
);
declareOrAppend("CFLAGS_TARGET", "-O0"); // to ensure that qjsbootstrap binary size is predictable
