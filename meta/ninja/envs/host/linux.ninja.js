// Host: x86_64 linux
declare("LTO_HOST", "y");
declare("CC_HOST", "gcc");
declare("AR_HOST", "gcc-ar");
declare("DEFINES_HOST", "-D_GNU_SOURCE -D__linux__");
declare("LDFLAGS_HOST", "-rdynamic");
declare("LIBS_HOST", "-ldl -lpthread");
