build({
  output: builddir("intermediate/quickjs-libc.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libc.c")],
});

build({
  output: builddir("intermediate/quickjs-libc.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libc.c")],
});
