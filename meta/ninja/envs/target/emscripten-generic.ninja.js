// Target: Emscripten Generic (WebAssembly via Emscripten SDK)
// Runnable via Node.js or in a browser

declare("CC_TARGET", "emcc");
declare("AR_TARGET", "emar");
declare("LDEXPORT_TARGET", "");

declareOrAppend("CFLAGS_TARGET", "-pthread");
declareOrAppend("LDFLAGS_TARGET", "-pthread -sALLOW_MEMORY_GROWTH=1 -sEXIT_RUNTIME=1");

declare("PROGRAM_SUFFIX_TARGET", ".js");

declare("SKIP_SHARED_LIBS", true);
declare("SKIP_QJSBOOTSTRAP", true);
declare("SKIP_RUN_TEST262", true);
