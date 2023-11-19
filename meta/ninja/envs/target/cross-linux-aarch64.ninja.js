// Target: aarch64 (arm 64-bit) linux
if (process.arch === "arm64") {
  // If target arch is the same as host arch, compile natively instead
  // of using cross-compiler.
  require("./linux.ninja");
} else {
  declare("LTO_TARGET", "y");
  declare("CC_TARGET", "aarch64-linux-gnu-gcc");
  declare("AR_TARGET", "aarch64-linux-gnu-gcc-ar");
  declare("DEFINES_TARGET", "-D_GNU_SOURCE");
  declare("LDEXPORT_TARGET", "-rdynamic");
}
