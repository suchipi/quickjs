// Target: aarch64 freebsd (cross-compiled from linux using clang)
declare("CC_TARGET", "freebsd-cc-aarch64");
declare("AR_TARGET", "llvm-ar");
declare("LDEXPORT_TARGET", "-rdynamic");

if (process.env.CONFIG_FETCH !== "0") {
  declareOrAppend("LIBS_TARGET", "-lcurl");
}
