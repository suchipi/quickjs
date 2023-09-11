// Target: x86_64 windows
declare("LTO_TARGET", "y");
declare("CC_TARGET", "x86_64-w64-mingw32-gcc");
declare("AR_TARGET", "x86_64-w64-mingw32-gcc-ar");
declare("DEFINES_TARGET", [
  "-D_WIN32",
  // to get environ
  "-D_GNU_SOURCE",
  // to get standard snprintf behavior
  "-D__USE_MINGW_ANSI_STDIO",
  // to get localtime_r
  "-D_POSIX_THREAD_SAFE_FUNCTIONS",
]);
// statically-linked so that it doesn't depend on libwinpthread-1.dll
declare("LDEXPORT_TARGET", "-static");

declare("PROGRAM_SUFFIX", ".exe");

declare("SKIP_SHARED_LIBS", true);
