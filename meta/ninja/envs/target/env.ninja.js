// Host: anything (configure stuff yourself via env vars)

declare("LTO_TARGET", env.LTO || "n");
declare("CC_TARGET", env.CC || "cc");
declare("AR_TARGET", env.AR || "ar");
declare("DEFINES_TARGET", env.DEFINES || "");
declare("CFLAGS_TARGET", env.CFLAGS || "");
declare("LDFLAGS_TARGET", env.LDFLAGS || "");
declare("LIBS_TARGET", env.LIBS || "-ldl -lpthread");

console.error("LTO_TARGET", env.LTO || "n");
console.error("CC_TARGET", env.CC || "cc");
console.error("AR_TARGET", env.AR || "ar");
console.error("DEFINES_TARGET", env.DEFINES || "");
console.error("CFLAGS_TARGET", env.CFLAGS || "");
console.error("LDFLAGS_TARGET", env.LDFLAGS || "");
console.error("LIBS_TARGET", env.LIBS || "-ldl -lpthread");
