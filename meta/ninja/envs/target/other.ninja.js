// Target: anything (configure stuff yourself via env vars)

declare("LTO_TARGET", env.LTO_TARGET || env.LTO || "n");
declare("CC_TARGET", env.CC_TARGET || env.CC || "cc");
declare("AR_TARGET", env.AR_TARGET || env.AR || "ar");
declare("DEFINES_TARGET", env.DEFINES_TARGET || env.DEFINES || "");
declare("CFLAGS_TARGET", env.CFLAGS_TARGET || env.CFLAGS || "");
declare("LDFLAGS_TARGET", env.LDFLAGS_TARGET || env.LDFLAGS || "");
declare("LDEXPORT_TARGET", env.LDEXPORT_TARGET || env.LDEXPORT || "-rdynamic");

console.error("LTO_TARGET", getVar("LTO_TARGET"));
console.error("CC_TARGET", getVar("CC_TARGET"));
console.error("AR_TARGET", getVar("AR_TARGET"));
console.error("DEFINES_TARGET", getVar("DEFINES_TARGET"));
console.error("CFLAGS_TARGET", getVar("CFLAGS_TARGET"));
console.error("LDFLAGS_TARGET", getVar("LDFLAGS_TARGET"));
console.error("LDEXPORT_TARGET", getVar("LDEXPORT_TARGET"));
