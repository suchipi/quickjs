build({
  output: builddir("intermediate/quickjs-curl.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-curl.c")],
});

build({
  output: builddir("intermediate/quickjs-curl.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-curl.c")],
});

build({
  output: builddir("dts/quickjs-curl.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-curl.d.ts")],
});

build({
  output: "meta/docs/quickjs-curl.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-curl.d.ts")],
});

build({
  output: builddir("include/quickjs-curl.h"),
  rule: "copy",
  inputs: [rel("quickjs-curl.h")],
});
