build({
  output: builddir("intermediate/gettime.host.o"),
  rule: "cc_host",
  inputs: [rel("gettime.c")],
});

build({
  output: builddir("intermediate/gettime.target.o"),
  rule: "cc_target",
  inputs: [rel("gettime.c")],
});
