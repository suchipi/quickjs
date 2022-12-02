// Host: linux (arch may vary)

declare("LTO_HOST", "y");
declare("CC_HOST", "gcc");
declare("AR_HOST", "gcc-ar");
declare("DEFINES_HOST", "-D_GNU_SOURCE -D__linux__");
declare("CFLAGS_HOST", "-O0"); // to ensure that qjsbootstrap binary size is predictable
declare("LDFLAGS_HOST", "-static");
declare("LIBS_HOST", "-ldl -lpthread");
