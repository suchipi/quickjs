build({
  output: builddir("intermediate/quickjs-libcontext.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libcontext.c")],
});

build({
  output: builddir("intermediate/quickjs-libcontext.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libcontext.c")],
});

build({
  output: builddir("dts/quickjs-libcontext.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libcontext.d.ts")],
});

build({
  output: builddir("include/quickjs-libcontext.h"),
  rule: "copy",
  inputs: [rel("quickjs-libcontext.h")],
});
