build({
  output: builddir("intermediate/quickjs-modulesys.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-modulesys.c")],
});

build({
  output: builddir("intermediate/quickjs-modulesys.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-modulesys.c")],
});
