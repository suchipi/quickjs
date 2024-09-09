build({
  output: builddir("intermediate/cutils.host.o"),
  rule: "cc_host",
  inputs: [rel("cutils.c")],
});

build({
  output: builddir("intermediate/cutils.target.o"),
  rule: "cc_target",
  inputs: [rel("cutils.c")],
});
