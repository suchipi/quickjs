build({
  output: builddir("intermediate/quickjs-encoding.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-encoding.c")],
});

build({
  output: builddir("intermediate/quickjs-encoding.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-encoding.c")],
});

build({
  output: builddir("dts/quickjs-encoding.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-encoding.d.ts")],
});

build({
  output: builddir("include/quickjs-encoding.h"),
  rule: "copy",
  inputs: [rel("quickjs-encoding.h")],
});
