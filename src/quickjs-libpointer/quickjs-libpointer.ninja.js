build({
  output: builddir("intermediate/quickjs-libpointer.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libpointer.c")],
});

build({
  output: builddir("intermediate/quickjs-libpointer.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libpointer.c")],
});

build({
  output: builddir("dts/quickjs-libpointer.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libpointer.d.ts")],
});
