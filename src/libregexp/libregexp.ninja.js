build({
  output: builddir("libregexp.host.o"),
  rule: "cc_host",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("libunicode.host.o")],
});

build({
  output: builddir("libregexp.target.o"),
  rule: "cc_target",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("libunicode.target.o")],
});
