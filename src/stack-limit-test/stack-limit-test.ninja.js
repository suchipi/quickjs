build(builddir("loop.c"), "qjsc", [rel("loop.js")], [builddir("qjsc.host")]);

build(builddir("stack-limit-test.host"), "compile_host_c_program", [
  rel("main.c"),
  builddir("loop.c"),
  builddir("quickjs-full.host.a"),
]);

build(builddir("stack-limit-test.target"), "compile_target_c_program", [
  rel("main.c"),
  builddir("loop.c"),
  builddir("quickjs-full.target.a"),
]);
