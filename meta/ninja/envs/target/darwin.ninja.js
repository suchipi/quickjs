// Target: darwin (same arch as host)

declare("CC_TARGET", "clang");
declare("AR_TARGET", "ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_TARGET", "-undefined dynamic_lookup");
