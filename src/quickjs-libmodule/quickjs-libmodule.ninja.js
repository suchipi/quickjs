build({
  output: builddir("intermediate/quickjs-libmodule.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libmodule.c")],
});

build({
  output: builddir("intermediate/quickjs-libmodule.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libmodule.c")],
});

build({
  output: builddir("dts/quickjs-libmodule.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libmodule.d.ts")],
});
