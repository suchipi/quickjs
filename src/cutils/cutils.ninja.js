build({
  output: builddir("cutils.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("cutils.c")],
});

build({
  output: builddir("cutils.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("cutils.c")],
});
