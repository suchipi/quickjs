build(builddir("libbf.host.o"), "compile_host_c_object", [rel("libbf.c")]);
build(builddir("libbf.target.o"), "compile_target_c_object", [rel("libbf.c")]);
