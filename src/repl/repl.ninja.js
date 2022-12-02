const repl_c = build({
  output: builddir("intermediate/repl.c"),
  rule: "qjsc",
  inputs: [rel("repl.js")],
  implicitInputs: [builddir("intermediate/qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("intermediate/repl.host.o"),
  rule: "cc_host",
  inputs: [repl_c],
});

build({
  output: builddir("intermediate/repl.target.o"),
  rule: "cc_target",
  inputs: [repl_c],
});
