build({
  output: builddir("intermediate/quickjs-bytecodelib.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-bytecodelib.c")],
});

build({
  output: builddir("intermediate/quickjs-bytecodelib.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-bytecodelib.c")],
});
