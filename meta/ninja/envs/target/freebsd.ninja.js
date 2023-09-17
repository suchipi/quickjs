// Target: freebsd (arch may vary)

declare("CC_TARGET", "cc");
declare("AR_TARGET", "ar");
declare("LDEXPORT_TARGET", "-rdynamic");
declare("CFLAGS_TARGET", "-fPIC");
