// Host: linux (arch may vary)

declare("LTO_HOST", "y");
declare("CC_HOST", "gcc");
declare("AR_HOST", "gcc-ar");
declare("DEFINES_HOST", "-D_GNU_SOURCE -D__linux__");

// TODO: how to link libcurl statically?
// declare("LDFLAGS_HOST", "-static");
declare("LDFLAGS_HOST", "-rdynamic");
