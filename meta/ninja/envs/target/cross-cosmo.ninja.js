// Target: Cosmopolitan Libc (cross-compiled from linux using cosmocc)
declare("CC_TARGET", "cosmocc");
declare("AR_TARGET", "cosmoar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__COSMO__");
declare("LDEXPORT_TARGET", "-rdynamic");

declare("PROGRAM_SUFFIX_TARGET", ".com");

declare("SKIP_SHARED_LIBS", true);
declare("SKIP_QJSBOOTSTRAP", true);
