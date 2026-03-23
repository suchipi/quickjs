// Target: linux (same arch as host)

declare("LTO_TARGET", "y");
declare("CC_TARGET", "gcc");
declare("AR_TARGET", "gcc-ar");
declare("DEFINES_TARGET", "-D_GNU_SOURCE");
declare("LDEXPORT_TARGET", "-static");

if (process.env.CONFIG_FETCH !== "0") {
  declareOrAppend("LIBS_TARGET", "-lcurl -lssl -lcrypto -lz");
}
