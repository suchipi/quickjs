build({
  output: builddir("intermediate/quickjs-utils.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-utils.c")],
});

build({
  output: builddir("intermediate/quickjs-utils.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-utils.c")],
});

build({
  output: builddir("include/quickjs-utils.h"),
  rule: "copy",
  inputs: [rel("quickjs-utils.h")],
});
