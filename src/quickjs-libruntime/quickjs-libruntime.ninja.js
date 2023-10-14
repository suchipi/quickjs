build({
  output: builddir("intermediate/quickjs-libruntime.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libruntime.c")],
});

build({
  output: builddir("intermediate/quickjs-libruntime.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libruntime.c")],
});

build({
  output: builddir("dts/quickjs-libruntime.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libruntime.d.ts")],
});
