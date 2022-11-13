build(builddir("cutils.host.o"), "compile_host_c_object", [rel("cutils.c")]);
build(builddir("cutils.target.o"), "compile_target_c_object", [
  rel("cutils.c"),
]);
