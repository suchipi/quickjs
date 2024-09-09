build({
  output: builddir("intermediate/quickjs-libengine.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libengine.c")],
});

build({
  output: builddir("intermediate/quickjs-libengine.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libengine.c")],
});

build({
  output: builddir("dts/quickjs-libengine.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libengine.d.ts")],
});

build({
  output: builddir("include/quickjs-libengine.h"),
  rule: "copy",
  inputs: [rel("quickjs-libengine.h")],
});
