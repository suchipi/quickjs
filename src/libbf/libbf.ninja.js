build({
  output: builddir("libbf.host.o"),
  rule: "cc_host",
  inputs: [rel("libbf.c")],
});

build({
  output: builddir("libbf.target.o"),
  rule: "cc_target",
  inputs: [rel("libbf.c")],
});
