build(builddir("quickjs-libc.host.o"), "compile_host_c_object", [
  rel("quickjs-libc.c"),
]);
build(builddir("quickjs-libc.target.o"), "compile_target_c_object", [
  rel("quickjs-libc.c"),
]);
