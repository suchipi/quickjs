// Host: windows msys2 ucrt64 (arch may vary)

declare("CC_HOST", "gcc");
declare("AR_HOST", "ar");
declare("LDEXPORT_HOST", "-static");
declare("PROGRAM_SUFFIX_HOST", ".exe");

// needed for localtime_r
declare("DEFINES_HOST", "-D_POSIX_C_SOURCE");
// needed for __imp_gethostname
declare("LIBS_HOST", "-lws2_32");
