build({
  output: builddir("intermediate/quickjs-print.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-print.c")],
});

build({
  output: builddir("intermediate/quickjs-print.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-print.c")],
});

build({
  output: builddir("dts/quickjs-print.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-print.d.ts")],
});

build({
  output: "meta/docs/quickjs-print.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-print.d.ts")],
});

build({
  output: builddir("include/quickjs-print.h"),
  rule: "copy",
  inputs: [rel("quickjs-print.h")],
});
