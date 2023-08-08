// Host: linux (arch may vary)

declare("LTO_HOST", "y");
declare("CC_HOST", "gcc");
declare("AR_HOST", "gcc-ar");
declare("DEFINES_HOST", "-D_GNU_SOURCE -D__linux__");
declare("CFLAGS_HOST", "-Ofast");
declare("LDEXPORT_HOST", "-rdynamic");
