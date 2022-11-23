build({
  output: builddir("cutils.host.o"),
  rule: "cc_host",
  inputs: [rel("cutils.c")],
});

build({
  output: builddir("cutils.target.o"),
  rule: "cc_target",
  inputs: [rel("cutils.c")],
});
