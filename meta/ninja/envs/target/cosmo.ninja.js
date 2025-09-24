// Target: Cosmopolitan Libc (https://github.com/jart/cosmopolitan)

declare("CC_TARGET", "unknown-unknown-cosmo-cc");
declare("AR_TARGET", "unknown-unknown-cosmo-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__COSMO__");
declare("LDEXPORT_TARGET", "-rdynamic");

declare("PROGRAM_SUFFIX_TARGET", ".com");
