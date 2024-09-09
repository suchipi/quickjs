build({
  output: builddir("intermediate/quickjs-bytecode.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-bytecode.c")],
});

build({
  output: builddir("intermediate/quickjs-bytecode.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-bytecode.c")],
});

build({
  output: builddir("dts/quickjs-bytecode.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-bytecode.d.ts")],
});

build({
  output: builddir("include/quickjs-bytecode.h"),
  rule: "copy",
  inputs: [rel("quickjs-bytecode.h")],
});
