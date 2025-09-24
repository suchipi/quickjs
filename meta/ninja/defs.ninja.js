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
