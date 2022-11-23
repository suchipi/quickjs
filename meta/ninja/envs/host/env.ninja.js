// Host: anything (configure stuff yourself via env vars)

declare("LTO_HOST", env.LTO || "n");
declare("CC_HOST", env.CC || "cc");
declare("AR_HOST", env.AR || "ar");
declare("DEFINES_HOST", env.DEFINES || "");
declare("CFLAGS_HOST", env.CFLAGS || "");
declare("LDFLAGS_HOST", env.LDFLAGS || "");
declare("LIBS_HOST", env.LIBS || "-ldl -lpthread");

console.error("LTO_HOST", env.LTO || "n");
console.error("CC_HOST", env.CC || "cc");
console.error("AR_HOST", env.AR || "ar");
console.error("DEFINES_HOST", env.DEFINES || "");
console.error("CFLAGS_HOST", env.CFLAGS || "");
console.error("LDFLAGS_HOST", env.LDFLAGS || "");
console.error("LIBS_HOST", env.LIBS || "-ldl -lpthread");
