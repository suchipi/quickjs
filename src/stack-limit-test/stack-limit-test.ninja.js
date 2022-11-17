build(builddir("loop.c"), "qjsc", [rel("loop.js")], [builddir("qjsc.host")]);

build(builddir("stack-limit-test.host"), "compile_host_c_program", [
  builddir("stack-limit-test.c"),
  builddir("quickjs-full.host.a"),
]);

build(builddir("stack-limit-test.target"), "compile_target_c_program", [
  builddir("stack-limit-test.c"),
  builddir("quickjs-full.target.a"),
]);
