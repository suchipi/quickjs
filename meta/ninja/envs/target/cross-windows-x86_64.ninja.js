// Target: x86_64 windows
declare("LTO_TARGET", "y");
declare("CC_TARGET", "x86_64-w64-mingw32-gcc");
declare("AR_TARGET", "x86_64-w64-mingw32-gcc-ar");
// __USE_MINGW_ANSI_STDIO for standard snprintf behavior
declare("DEFINES_TARGET", "-D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32");
declare("LIBS_TARGET", "-lpthread");
declare("CFLAGS_TARGET", "-O0"); // to ensure that qjsbootstrap binary size is predictable
// statically-linked so that it doesn't depend on libwinpthread-1.dll
declare("LDFLAGS_TARGET", "-static");

declare("DOTEXE", ".exe");
