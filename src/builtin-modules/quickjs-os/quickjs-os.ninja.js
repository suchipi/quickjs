build({
  output: builddir("intermediate/quickjs-os.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-os.c")],
});

build({
  output: builddir("intermediate/quickjs-os.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-os.c")],
});

build({
  output: builddir("dts/quickjs-os.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-os.d.ts")],
});

build({
  output: builddir("include/quickjs-os.h"),
  rule: "copy",
  inputs: [rel("quickjs-os.h")],
});
