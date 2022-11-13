build(builddir("quickjs.host.o"), "compile_host_c_object", [rel("quickjs.c")]);
build(builddir("quickjs.target.o"), "compile_target_c_object", [
  rel("quickjs.c"),
]);
