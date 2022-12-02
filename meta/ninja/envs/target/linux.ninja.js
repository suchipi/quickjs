// Target: linux (same arch as host)

declare("LTO_TARGET", "y");
declare("CC_TARGET", "gcc");
declare("AR_TARGET", "gcc-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__linux__");
declare("CFLAGS_TARGET", "-O0"); // to ensure that qjsbootstrap binary size is predictable
declare("LDFLAGS_TARGET", "-static");
declare("LIBS_TARGET", "-ldl -lpthread");
