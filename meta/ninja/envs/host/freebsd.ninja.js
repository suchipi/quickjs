// Host: freebsd (arch may vary)

declare("CC_HOST", "cc");
declare("AR_HOST", "ar");
declare("LDFLAGS_HOST", "-static");
declare("LIBS_HOST", "-ldl -lpthread");
declareOrAppend("CFLAGS_HOST", "-O0"); // to ensure that qjsbootstrap binary size is predictable
