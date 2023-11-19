// Host: linux (arch may vary)

declare("LTO_HOST", "y");
declare("CC_HOST", "gcc");
declare("AR_HOST", "gcc-ar");
declare("DEFINES_HOST", "-D_GNU_SOURCE");
declare("LDEXPORT_HOST", "-rdynamic");
