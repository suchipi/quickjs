// Target: Emscripten Node.js (WebAssembly via Emscripten SDK)
// Runnable via Node.js, with real filesystem access via NODERAWFS

declare("CC_TARGET", "emcc");
declare("AR_TARGET", "emar");
declare("LDEXPORT_TARGET", "");

declareOrAppend("CFLAGS_TARGET", "-pthread");
declareOrAppend("LDFLAGS_TARGET", "-pthread -sALLOW_MEMORY_GROWTH=1 -sEXIT_RUNTIME=1 -sENVIRONMENT=node -sNODERAWFS=1");

declare("PROGRAM_SUFFIX_TARGET", ".js");

declare("SKIP_SHARED_LIBS", true);
declare("SKIP_QJSBOOTSTRAP", true);
declare("SKIP_RUN_TEST262", true);
