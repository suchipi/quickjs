// Target: x86_64 linux
declare("LTO_TARGET", "y");
declare("CC_TARGET", "gcc");
declare("AR_TARGET", "gcc-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__linux__");
declare("LDFLAGS_TARGET", "-rdynamic");
declare("LIBS_TARGET", "-ldl -lpthread");
