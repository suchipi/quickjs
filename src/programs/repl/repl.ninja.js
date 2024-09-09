const repl_c = build({
  output: builddir("intermediate/repl.c"),
  rule: "qjsc-minimal",
  inputs: [rel("repl.js")],
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
