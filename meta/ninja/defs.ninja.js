const path = require("path");

const headerFiles = glob("**/*.h", {
  cwd: path.resolve(__dirname, "../.."),
});

const dirsWithHeaderFiles = Array.from(
  new Set(headerFiles.map((file) => path.dirname(file)))
);

for (const suffix of ["HOST", "TARGET"]) {
  // ".exe" on windows or ".com" when targeting Cosmopolitan Libc
  if (getVar(`PROGRAM_SUFFIX_${suffix}`) == null) {
    declare(`PROGRAM_SUFFIX_${suffix}`, "");
  }

  // Standard safe compiler optimizations
  declareOrAppend(`CFLAGS_${suffix}`, "-O2");

  // Show all warnings.
  declareOrAppend(`CFLAGS_${suffix}`, "-Wall");

  // Enforce GNU C11 standard (C11 + GNU extensions)
  declareOrAppend(`CFLAGS_${suffix}`, "-std=gnu11");

  // Add include for build dir intermediates (for generated headers)
  declareOrAppend(`CFLAGS_${suffix}`, "-I" + builddir("intermediate"));

  // Add includes for all dirs with header files
  declareOrAppend(
    `CFLAGS_${suffix}`,
    dirsWithHeaderFiles.map((dir) => "-I" + dir).join(" ")
  );

  // Include source debugging info in the binaries
  declareOrAppend(`LDFLAGS_${suffix}`, "-g");

  // math functions and constants. <math.h>
  declareOrAppend(`LIBS_${suffix}`, "-lm");

  // multithreading. <pthread.h>
  declareOrAppend(`LIBS_${suffix}`, "-lpthread");

  declareOrAppend(
    `DEFINES_${suffix}`,
    '-DCONFIG_VERSION="\\"suchipi-`git rev-parse --short HEAD`\\""'
  );

  // Uncomment to print debug info
  // declareOrAppend(`DEFINES_${suffix}`, "-DDEBUG");

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

  // Encoding library configuration - disabled if CONFIG_*=0
  if (process.env.CONFIG_SHIFTJIS === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_SHIFTJIS=0");
  }
  if (process.env.CONFIG_WINDOWS1252 === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_WINDOWS1252=0");
  }
  if (process.env.CONFIG_WINDOWS1251 === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_WINDOWS1251=0");
  }
  if (process.env.CONFIG_BIG5 === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_BIG5=0");
  }
  if (process.env.CONFIG_EUCKR === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_EUCKR=0");
  }
  if (process.env.CONFIG_EUCJP === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_EUCJP=0");
  }
  if (process.env.CONFIG_GB18030 === "0") {
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_GB18030=0");
  }

  // always treat chars as unsigned for consistent bytecode
  declareOrAppend(`CFLAGS_${suffix}`, "-funsigned-char");

  if (getVar(`LDEXPORT_${suffix}`)?.match(/-rdynamic/)) {
    // Enable importing *.so library modules from JS code.
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_SHARED_LIBRARY_MODULES");
    // the dynamic linker API
    declareOrAppend(`LIBS_${suffix}`, "-ldl");
    // Position-independent code; needed for shared libraries.
    declareOrAppend(`CFLAGS_${suffix}`, "-fPIC");
  }
}
