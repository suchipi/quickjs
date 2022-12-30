const path = require("path");

// DOTEXE is the suffix for binaries which should end with .exe on windows
if (getVar("DOTEXE") == null) {
  declare("DOTEXE", "");
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

  // disable all compiler optimizations, to ensure that qjsbootstrap binary
  // size is predictable. TODO: only do this for qjsbootstrap itself
  declareOrAppend(`CFLAGS_${suffix}`, "-O0");

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

  // Uncomment to enable importing *.so library modules from JS code.
  // Disabled because we make static binaries.
  // declareOrAppend(`DEFINES_${suffix}`, "-DCONFIG_SHARED_LIBRARY_MODULES");
  // declareOrAppend(`LIBS_${suffix}`, "-ldl");

  // Uncomment to print debug info
  // declareOrAppend(`DEFINES_${suffix}`, "-DDEBUG");

  // uncomment to print debugging log messages about module resolution
  // declareOrAppend(`DEFINES_${suffix}`, "-DDUMP_MODULE_RESOLVE");
}
