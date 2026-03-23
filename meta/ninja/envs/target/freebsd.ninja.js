// Target: freebsd (arch may vary)

declare("CC_TARGET", "cc");
declare("AR_TARGET", "ar");
declare("LDEXPORT_TARGET", "-rdynamic");

if (process.env.CONFIG_FETCH !== "0") {
  declareOrAppend("LIBS_TARGET", "-lcurl");
}
