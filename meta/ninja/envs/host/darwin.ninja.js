// Host: darwin (arch may vary)

declare("CC_HOST", "clang");
declare("AR_HOST", "ar");
declare("DEFINES_HOST", "-D__APPLE__");
declare("LDEXPORT_HOST", "-rdynamic");
declare(
  "CFLAGS_HOST",
  "-Ofast -funsigned-char -Wno-unused-command-line-argument -fPIC -Wno-implicit-int-float-conversion"
);
declare("SHARED_LIBRARY_FLAGS_HOST", "-undefined dynamic_lookup");
