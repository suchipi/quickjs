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
  rule: "cc_host",
  inputs: [builddir("qjscalc.c")],
});

build({
  output: builddir("qjscalc.target.o"),
  rule: "cc_target",
  inputs: [builddir("qjscalc.c")],
});
