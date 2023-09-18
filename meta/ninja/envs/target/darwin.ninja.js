// Target: darwin (same arch as host)

declare("CC_TARGET", "clang");
declare("AR_TARGET", "ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("CFLAGS_TARGET", [
  "-Ofast",
  "-funsigned-char",
  "-Wno-unused-command-line-argument",
  "-fPIC",
  "-Wno-implicit-int-float-conversion",

  // libraries installed via macports (libzip)
  "-I/opt/local/include",
]);
declare("LDFLAGS_TARGET", [
  // libraries installed via macports (libzip)
  "-L/opt/local/lib",
]);
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
