// Target: freebsd (arch may vary)

declare("CC_TARGET", "cc");
declare("AR_TARGET", "ar");
declare("LDFLAGS_TARGET", "-static");
declare("LIBS_TARGET", "-ldl -lpthread");
declareOrAppend("CFLAGS_TARGET", "-O0"); // to ensure that qjsbootstrap binary size is predictable
