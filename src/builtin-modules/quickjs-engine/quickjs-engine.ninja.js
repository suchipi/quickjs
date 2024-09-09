build({
  output: builddir("intermediate/quickjs-engine.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-engine.c")],
});

build({
  output: builddir("intermediate/quickjs-engine.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-engine.c")],
});

build({
  output: builddir("dts/quickjs-engine.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-engine.d.ts")],
});

build({
  output: builddir("include/quickjs-engine.h"),
  rule: "copy",
  inputs: [rel("quickjs-engine.h")],
});
