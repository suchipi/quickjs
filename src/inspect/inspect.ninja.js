build(builddir("inspect.c"), "qjsc", [rel("inspect.js")]);
build(builddir("inspect.host.o"), "compile_host_c_object", [rel("inspect.c")]);
build(builddir("inspect.target.o"), "compile_target_c_object", [
  rel("inspect.c"),
]);
