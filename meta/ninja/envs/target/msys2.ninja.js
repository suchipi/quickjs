// Target: windows msys2 ucrt64 (arch may vary)

declare("CC_TARGET", "gcc");
declare("AR_TARGET", "ar");
declare("LDEXPORT_TARGET", "-static");
declare("PROGRAM_SUFFIX_TARGET", ".exe");

// needed for localtime_r
declare("DEFINES_TARGET", "-D_POSIX_C_SOURCE");
// needed for __imp_gethostname
declare("LIBS_TARGET", "-lws2_32");
