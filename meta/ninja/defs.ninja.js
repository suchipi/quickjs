const path = require("path");

// PROGRAM_SUFFIX is ".exe" on windows or ".com" when targeting Cosmopolitan Libc
if (getVar("PROGRAM_SUFFIX") == null) {
  declare("PROGRAM_SUFFIX", "");
}

const headerFiles = glob("**/*.h", {
  cwd: path.resolve(__dirname, "../.."),
});

const dirsWithHeaderFiles = Array.from(
  new Set(headerFiles.map((file) => path.dirname(file)))
);

for (const suffix of ["HOST", "TARGET"]) {
  // Show all warnings.
  declareOrAppend(`CFLAGS_${suffix}`, "-Wall");

  // Add include for build dir intermediates (for generated headers)
  declareOrAppend(`CFLAGS_${suffix}`, "-I" + builddir("intermediate"));

  // Add includes for all dirs with header files
  declareOrAppend(
    `CFLAGS_${suffix}`,
    dirsWithHeaderFiles.map((dir) => "-I" + dir).join(" ")
  );

  // enable compiler optimizations
  declareOrAppend(`CFLAGS_${suffix}`, "-O3");

  // Include source debugging info in the binaries
  declareOrAppend(`LDFLAGS_${suffix}`, "-g");

  // math functions and constants. <math.h>
  declareOrAppend(`LIBS_${suffix}`, "-lm");

  // zip archive lib; https://libzip.org/. <zip.h>
  declareOrAppend(`LIBS_${suffix}`, "-lzip");

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

  if (getVar(`LDEXPORT_${suffix}`)?.match(/-rdynamic/)) {
    // Enable importing *.so library modules from JS code.
    declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_SHARED_LIBRARY_MODULES");
    declareOrAppend(`LIBS_${suffix}`, "-ldl");
  }
}
