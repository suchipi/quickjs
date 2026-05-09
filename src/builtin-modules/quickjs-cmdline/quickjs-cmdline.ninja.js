build({
  output: builddir("intermediate/quickjs-cmdline.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-cmdline.c")],
});

build({
  output: builddir("intermediate/quickjs-cmdline.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-cmdline.c")],
});

build({
  output: builddir("dts/quickjs-cmdline.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-cmdline.d.ts")],
});

build({
  output: "meta/docs/quickjs-cmdline.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-cmdline.d.ts")],
});

build({
  output: builddir("include/quickjs-cmdline.h"),
  rule: "copy",
  inputs: [rel("quickjs-cmdline.h")],
});
