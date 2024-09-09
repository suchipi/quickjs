build({
  output: builddir("intermediate/libregexp.host.o"),
  rule: "cc_host",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("intermediate/libunicode.host.o")],
});

build({
  output: builddir("intermediate/libregexp.target.o"),
  rule: "cc_target",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("intermediate/libunicode.target.o")],
});
