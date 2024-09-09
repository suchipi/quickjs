build({
  output: builddir("intermediate/quickjs-libencoding.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libencoding.c")],
});

build({
  output: builddir("intermediate/quickjs-libencoding.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libencoding.c")],
});

build({
  output: builddir("dts/quickjs-libencoding.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libencoding.d.ts")],
});

build({
  output: builddir("include/quickjs-libencoding.h"),
  rule: "copy",
  inputs: [rel("quickjs-libencoding.h")],
});
