build({
  output: builddir("libbf.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("libbf.c")],
});

build({
  output: builddir("libbf.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("libbf.c")],
});
