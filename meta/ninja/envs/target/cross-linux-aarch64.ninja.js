// Target: aarch64 (arm 64-bit) linux
declare("LTO_TARGET", "y");
declare("CC_TARGET", "aarch64-linux-gnu-gcc-9");
declare("AR_TARGET", "aarch64-linux-gnu-gcc-ar-9");
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__linux__");
declare("LDFLAGS_TARGET", "-static");
declare("LIBS_TARGET", "-ldl -lpthread");
