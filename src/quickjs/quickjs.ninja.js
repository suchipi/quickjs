build({
  output: builddir("intermediate/quickjs.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs.c")],
});

build({
  output: builddir("intermediate/quickjs.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs.c")],
});

build({
  output: builddir("dts/quickjs.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs.d.ts")],
});

build({
  output: builddir("include/quickjs.h"),
  rule: "copy",
  inputs: [rel("quickjs.h")],
});
