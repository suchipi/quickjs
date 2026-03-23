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
// 8MB stack size (Windows default is 1MB, which is too small)
declare("LDEXPORT_TARGET", "-static -Wl,--stack,8388608");

declare("PROGRAM_SUFFIX_TARGET", ".exe");

declare("SKIP_SHARED_LIBS", true);

// Without this, we get a linking error "undefined reference to __imp_gethostname".
// But it's not clear why we weren't getting that error before...
declareOrAppend("LIBS_TARGET", "-lws2_32");

if (process.env.CONFIG_FETCH !== "0") {
  declareOrAppend("LIBS_TARGET", "-lwinhttp");
}
