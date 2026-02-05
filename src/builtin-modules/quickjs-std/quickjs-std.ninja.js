build({
  output: builddir("intermediate/quickjs-std.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-std.c")],
});

build({
  output: builddir("intermediate/quickjs-std.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-std.c")],
});

build({
  output: builddir("dts/quickjs-std.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-std.d.ts")],
});

build({
  output: builddir("include/quickjs-std.h"),
  rule: "copy",
  inputs: [rel("quickjs-std.h")],
});
