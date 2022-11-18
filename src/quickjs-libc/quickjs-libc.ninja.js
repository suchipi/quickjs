build({
  output: builddir("quickjs-libc.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("quickjs-libc.c")],
});

build({
  output: builddir("quickjs-libc.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("quickjs-libc.c")],
});
