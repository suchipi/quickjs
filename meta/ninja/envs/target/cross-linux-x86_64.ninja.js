// Target: x86_64 linux
if (process.arch === "x64") {
  // If target arch is the same as host arch, compile natively instead
  // of using cross-compiler.
  require("./linux.ninja");
} else {
  declare("LTO_TARGET", "y");
  declare("CC_TARGET", "x86_64-linux-gnu-gcc");
  declare("AR_TARGET", "x86_64-linux-gnu-gcc-ar");
  declare("DEFINES_TARGET", "-D_GNU_SOURCE");
  declare("LDEXPORT_TARGET", "-rdynamic");
  declare("LDFLAGS_TARGET", "-L/usr/x86_64-linux-gnu/lib/");
}
