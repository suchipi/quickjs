build({
  output: builddir("intermediate/quickjs-pointer.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-pointer.c")],
});

build({
  output: builddir("intermediate/quickjs-pointer.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-pointer.c")],
});

build({
  output: builddir("dts/quickjs-pointer.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-pointer.d.ts")],
});

build({
  output: builddir("include/quickjs-pointer.h"),
  rule: "copy",
  inputs: [rel("quickjs-pointer.h")],
});
