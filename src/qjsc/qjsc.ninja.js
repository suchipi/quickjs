build(builddir("qjsc.host"), "compile_host_c_program", [
  rel("qjsc.c"),
  builddir("quickjs-core.host.a"),
  builddir("quickjs-libc.host.o"),
]);

build(builddir("qjsc.target"), "compile_target_c_program", [
  rel("qjsc.c"),
  builddir("quickjs-core.target.a"),
  builddir("quickjs-libc.target.o"),
]);
