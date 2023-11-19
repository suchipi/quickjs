// Target: darwin (same arch as host)

declare("CC_TARGET", "clang");
declare("AR_TARGET", "ar");
declare("DEFINES_TARGET", "-D__APPLE__");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("CFLAGS_TARGET", "-O2");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
