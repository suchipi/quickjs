build({
  output: builddir("intermediate/libbf.host.o"),
  rule: "cc_host",
  inputs: [rel("libbf.c")],
});

build({
  output: builddir("intermediate/libbf.target.o"),
  rule: "cc_target",
  inputs: [rel("libbf.c")],
});
