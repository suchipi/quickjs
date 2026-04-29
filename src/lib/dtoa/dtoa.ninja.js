build({
  output: builddir("intermediate/dtoa.host.o"),
  rule: "cc_host",
  inputs: [rel("dtoa.c")],
});

build({
  output: builddir("intermediate/dtoa.target.o"),
  rule: "cc_target",
  inputs: [rel("dtoa.c")],
});
