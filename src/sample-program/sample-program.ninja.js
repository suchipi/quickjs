build(builddir("sum.c"), "qjsc", [rel("sum.js")], [builddir("qjsc.host")]);

build(builddir("sum.host"), "compile_host_c_program", [
  builddir("sum.c"),
  builddir("quickjs-full.host.a"),
]);

build(builddir("sum.target"), "compile_target_c_program", [
  builddir("sum.c"),
  builddir("quickjs-full.target.a"),
]);
