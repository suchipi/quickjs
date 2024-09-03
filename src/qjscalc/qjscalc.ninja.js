const qjscalc_c = build({
  output: builddir("intermediate/qjscalc.c"),
  rule: "qjsc-minimal",
  inputs: [rel("qjscalc.js")],
  ruleVariables: {
    qjsc_args: `-fbignum -c`,
  },
});

build({
  output: builddir("intermediate/qjscalc.host.o"),
  rule: "cc_host",
  inputs: [qjscalc_c],
});

build({
  output: builddir("intermediate/qjscalc.target.o"),
  rule: "cc_target",
  inputs: [qjscalc_c],
});
