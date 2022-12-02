// Host: darwin (arch may vary)

declare("CC_HOST", "clang");
declare("AR_HOST", "ar");
declare("DEFINES_HOST", "-D__APPLE__");
declare("LDFLAGS_HOST", "-rdynamic");
declare("LIBS_HOST", "-ldl -lpthread");
declare(
  "CFLAGS_HOST",
  "-funsigned-char -Wno-unused-command-line-argument -fPIC"
);
declareOrAppend("CFLAGS_HOST", "-O0"); // to ensure that qjsbootstrap binary size is predictable
