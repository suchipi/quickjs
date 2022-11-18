build({
  output: builddir("repl.c"),
  rule: "qjsc",
  inputs: [rel("repl.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("repl.host.o"),
  rule: "compile_host_c_object",
  inputs: [builddir("repl.c")],
});

build({
  output: builddir("repl.target.o"),
  rule: "compile_target_c_object",
  inputs: [builddir("repl.c")],
});
