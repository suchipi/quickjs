build({
  output: builddir("inspect.c"),
  rule: "qjsc",
  inputs: [rel("inspect.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("inspect.host.o"),
  rule: "compile_host_c_object",
  inputs: [builddir("inspect.c")],
});
build({
  output: builddir("inspect.target.o"),
  rule: "compile_target_c_object",
  inputs: [builddir("inspect.c")],
});
