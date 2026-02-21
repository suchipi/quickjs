// Target: Emscripten Web (WebAssembly via Emscripten SDK)
// Loadable in a web browser

require("./emscripten-generic.ninja.js");

declareOrAppend("LDFLAGS_TARGET", "-sENVIRONMENT=web,worker");
