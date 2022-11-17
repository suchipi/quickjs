build(builddir("run-test262.host"), "compile_host_c_program", [
  rel("run-test262.c"),
  builddir("quickjs-full.host.a"),
]);

build(builddir("run-test262.target"), "compile_target_c_program", [
  rel("run-test262.c"),
  builddir("quickjs-full.target.a"),
]);
