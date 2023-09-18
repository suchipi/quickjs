// Host: darwin (arch may vary)

declare("CC_HOST", "clang");
declare("AR_HOST", "ar");
declare("DEFINES_HOST", "-D__APPLE__");
declare("LDEXPORT_HOST", "-rdynamic");
declare("CFLAGS_HOST", [
  "-Ofast",
  "-funsigned-char",
  "-Wno-unused-command-line-argument",
  "-fPIC",
  "-Wno-implicit-int-float-conversion",

  // libraries installed via macports (libzip)
  "-I/opt/local/include",
]);
declare("LDFLAGS_HOST", [
  // libraries installed via macports (libzip)
  "-L/opt/local/lib",
]);
declare("SHARED_LIBRARY_FLAGS_HOST", "-undefined dynamic_lookup");
