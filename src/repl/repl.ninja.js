build(builddir("repl.c"), "qjsc", [rel("repl.js")], [builddir("qjsc.host")]);

build(builddir("repl.host.o"), "compile_host_c_object", [builddir("repl.c")]);

build(builddir("repl.target.o"), "compile_target_c_object", [
  builddir("repl.c"),
]);
