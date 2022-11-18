build({
  output: builddir("qjscalc.c"),
  rule: "qjsc",
  inputs: [rel("qjscalc.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-fbignum -c`,
  },
});

build({
  output: builddir("qjscalc.host.o"),
  rule: "compile_host_c_object",
  inputs: [builddir("qjscalc.c")],
});

build({
  output: builddir("qjscalc.target.o"),
  rule: "compile_target_c_object",
  inputs: [builddir("qjscalc.c")],
});
