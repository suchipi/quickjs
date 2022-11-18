build({
  output: builddir("libregexp.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("libunicode.host.o")],
});

build({
  output: builddir("libregexp.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("libregexp.c")],
  implicitInputs: [builddir("libunicode.target.o")],
});
