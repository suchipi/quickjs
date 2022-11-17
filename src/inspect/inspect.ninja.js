build(
  builddir("inspect.c"),
  "qjsc",
  [rel("inspect.js")],
  [builddir("qjsc.host")]
);
build(builddir("inspect.host.o"), "compile_host_c_object", [
  builddir("inspect.c"),
]);
build(builddir("inspect.target.o"), "compile_target_c_object", [
  builddir("inspect.c"),
]);
