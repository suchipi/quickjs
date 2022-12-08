// Target: linux (same arch as host)

declare("LTO_TARGET", "y");
declare("CC_TARGET", "gcc");
declare("AR_TARGET", "gcc-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__linux__");

// TODO: how to link libcurl statically?
// declare("LDFLAGS_TARGET", "-static");
declare("LDFLAGS_TARGET", "-rdynamic");
