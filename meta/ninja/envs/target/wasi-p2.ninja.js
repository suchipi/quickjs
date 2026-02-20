// Target: WASI P2 (WebAssembly System Interface Preview 2)
// Runnable via wasmtime, wasmer, etc.

const fs = require("fs");

const sdkPath =
  process.env.WASI_SDK_PATH ||
  (fs.existsSync("/opt/wasi-sdk") ? "/opt/wasi-sdk" : null);

if (!sdkPath) {
  throw new Error(
    "WASI_SDK_PATH environment variable must be set, or /opt/wasi-sdk must exist"
  );
}

declare(
  "CC_TARGET",
  `${sdkPath}/bin/clang --target=wasm32-wasip2 --sysroot=${sdkPath}/share/wasi-sysroot`
);
declare("AR_TARGET", `${sdkPath}/bin/ar`);
declare(
  "DEFINES_TARGET",
  "-D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID"
);
declare("LDEXPORT_TARGET", "");

declare("PROGRAM_SUFFIX_TARGET", ".wasm");

declare("SKIP_SHARED_LIBS", true);
declare("SKIP_QJSBOOTSTRAP", true);

declareOrAppend(
  "LIBS_TARGET",
  "-lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid"
);
