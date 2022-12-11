build({
  output: builddir("intermediate/execpath.host.o"),
  rule: "cc_host",
  inputs: [rel("execpath.c")],
});

build({
  output: builddir("intermediate/execpath.target.o"),
  rule: "cc_target",
  inputs: [rel("execpath.c")],
});
