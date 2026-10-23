build({
  output: builddir("intermediate/quickjs-net.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-net.c")],
});

build({
  output: builddir("intermediate/quickjs-net.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-net.c")],
});

build({
  output: builddir("dts/quickjs-net.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-net.d.ts")],
});

build({
  output: "meta/docs/quickjs-net.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-net.d.ts")],
});

build({
  output: builddir("include/quickjs-net.h"),
  rule: "copy",
  inputs: [rel("quickjs-net.h")],
});
