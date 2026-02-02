build({
  output: builddir("intermediate/utf-conv.host.o"),
  rule: "cc_host",
  inputs: [rel("utf-conv.c")],
});

build({
  output: builddir("intermediate/utf-conv.target.o"),
  rule: "cc_target",
  inputs: [rel("utf-conv.c")],
});
