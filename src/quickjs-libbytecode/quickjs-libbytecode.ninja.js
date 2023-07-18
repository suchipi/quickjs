build({
  output: builddir("intermediate/quickjs-libbytecode.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libbytecode.c")],
});

build({
  output: builddir("intermediate/quickjs-libbytecode.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libbytecode.c")],
});

build({
  output: builddir("dts/quickjs-libbytecode.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libbytecode.d.ts")],
});
