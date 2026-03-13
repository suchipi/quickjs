// Target: x86_64 freebsd (cross-compiled from linux using clang)
declare("CC_TARGET", "freebsd-cc-x86_64");
declare("AR_TARGET", "llvm-ar");
declare("LDEXPORT_TARGET", "-rdynamic");
