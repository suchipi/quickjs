// Target: wasm wasi via https://github.com/WebAssembly/wasi-sdk

declare("LTO_TARGET", "y");
declare("CC_TARGET", "clang-17");
declare("AR_TARGET", "llvm-ar-17");
declare("DEFINES_TARGET", [
  "-D_GNU_SOURCE",
  `-D_WASI_EMULATED_PROCESS_CLOCKS`,
  `-D_WASI_EMULATED_SIGNAL`,
]);
declare("CFLAGS_TARGET", [
  `--target=wasm32-wasi`,
  `--sysroot=/wasi-sysroot`,
  `-I/wasi-sysroot/include`,
  `-Ofast`,
  `-fPIC`,
  `-funsigned-char`,
  `-Wno-unused-command-line-argument`,
  `-Wno-implicit-int-float-conversion`,
]);
declare("LDFLAGS_TARGET", [
  `-lwasi-emulated-process-clocks`,
  `-lwasi-emulated-signal`,
]);
declare("LDEXPORT_TARGET", "-rdynamic");

declare("NO_QJSC_TARGET", true);
