build(builddir("qjs.host"), "compile_host_c_program", [
  rel("qjs.c"),
  builddir("quickjs-full.host.a"),
  builddir("qjscalc.host.o"),
  builddir("repl.host.o"),
]);

build(builddir("qjs.target"), "compile_target_c_program", [
  rel("qjs.c"),
  builddir("quickjs-full.target.a"),
  builddir("qjscalc.target.o"),
  builddir("repl.target.o"),
]);
