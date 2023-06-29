build({
  output: builddir("intermediate/quickjs-libdl.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libdl.c")],
});

build({
  output: builddir("intermediate/quickjs-libdl.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libdl.c")],
});
