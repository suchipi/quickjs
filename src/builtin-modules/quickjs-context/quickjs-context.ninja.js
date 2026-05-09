build({
  output: builddir("intermediate/quickjs-context.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-context.c")],
});

build({
  output: builddir("intermediate/quickjs-context.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-context.c")],
});

build({
  output: builddir("dts/quickjs-context.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-context.d.ts")],
});

build({
  output: "meta/docs/quickjs-context.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-context.d.ts")],
});

build({
  output: builddir("include/quickjs-context.h"),
  rule: "copy",
  inputs: [rel("quickjs-context.h")],
});
