// Target: Emscripten Node.js (WebAssembly via Emscripten SDK)
// Runnable via Node.js, with real filesystem access via NODERAWFS

require("./emscripten-generic.ninja.js");

declareOrAppend("LDFLAGS_TARGET", "-sENVIRONMENT=node -sNODERAWFS=1");
