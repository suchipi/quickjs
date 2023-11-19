// Host: darwin (arch may vary)

declare("CC_HOST", "clang");
declare("AR_HOST", "ar");
declare("LDEXPORT_HOST", "-rdynamic");
declare("SHARED_LIBRARY_FLAGS_HOST", "-undefined dynamic_lookup");
