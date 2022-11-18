build({
  output: builddir("quickjs.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("quickjs.c")],
});

build({
  output: builddir("quickjs.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("quickjs.c")],
});
