const repl_c = build({
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
  rule: "cc_host",
  inputs: [repl_c],
});

build({
  output: builddir("repl.target.o"),
  rule: "cc_target",
  inputs: [repl_c],
});
