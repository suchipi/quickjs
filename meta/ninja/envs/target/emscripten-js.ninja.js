// Target: Emscripten JS-only (no WebAssembly, JS output only via -sWASM=0)
// Single .js file output, no .wasm companion
//
// This target does NOT include workers because the wasm2js converter doesn't
// support 64-bit atomic operations.

declare("CC_TARGET", "emcc");
declare("AR_TARGET", "emar");
declare("LDEXPORT_TARGET", "");

declareOrAppend(
  "LDFLAGS_TARGET",
  "-sALLOW_MEMORY_GROWTH=1 -sEXIT_RUNTIME=1 -sWASM=0"
);

declare("PROGRAM_SUFFIX_TARGET", ".js");

declare("SKIP_SHARED_LIBS", true);
declare("SKIP_QJSBOOTSTRAP", true);
declare("SKIP_RUN_TEST262", true);
declare("SKIP_WORKER", true);
