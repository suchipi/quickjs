// Host: anything (configure stuff yourself via env vars)

declare("LTO_HOST", env.LTO_HOST || env.LTO || "n");
declare("CC_HOST", env.CC_HOST || env.CC || "cc");
declare("AR_HOST", env.AR_HOST || env.AR || "ar");
declare("DEFINES_HOST", env.DEFINES_HOST || env.DEFINES || "");
declare("CFLAGS_HOST", env.CFLAGS_HOST || env.CFLAGS || "");
declare("LDFLAGS_HOST", env.LDFLAGS_HOST || env.LDFLAGS || "");

console.error("LTO_HOST", getVar("LTO_HOST"));
console.error("CC_HOST", getVar("CC_HOST"));
console.error("AR_HOST", getVar("AR_HOST"));
console.error("DEFINES_HOST", getVar("DEFINES_HOST"));
console.error("CFLAGS_HOST", getVar("CFLAGS_HOST"));
console.error("LDFLAGS_HOST", getVar("LDFLAGS_HOST"));
