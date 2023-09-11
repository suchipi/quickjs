// Target: Cosmopolitan Libc (https://github.com/jart/cosmopolitan)

declare("CC_TARGET", "cosmocc");
declare("AR_TARGET", "x86_64-unknown-cosmo-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE");
declare("LDEXPORT_TARGET", "-rdynamic");

declare("PROGRAM_SUFFIX", ".com");
