for (const suffix of ["HOST", "TARGET"]) {
  // Show all warnings.
  declareOrAppend(`CFLAGS_${suffix}`, "-Wall");

  // Include source debugging info in the binaries
  declareOrAppend(`LDFLAGS_${suffix}`, "-g");

  // math functions and constants. <math.h>
  declareOrAppend(`LIBS_${suffix}`, "-lm");

  declareOrAppend(
    `DEFINES_${suffix}`,
    '-DCONFIG_VERSION="\\"suchipi-`git rev-parse --short HEAD`\\""'
  );

  // enable 'use math' and BigFloat
  declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_BIGNUM");

  if (getVar(`LTO_${suffix}`) === "y") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_LTO");
    declareOrAppend(`LDFLAGS_${suffix}`, "-flto");
  }

  // qjsc searchdir for quickjs.h
  declareOrAppend(`DEFINES_${suffix}`, '-DCONFIG_PREFIX="\\"/usr/local\\""');

  // include full unicode tables
  declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_ALL_UNICODE");
}
