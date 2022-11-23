const inspect_c = build({
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
  rule: "cc_host",
  inputs: [inspect_c],
});
build({
  output: builddir("inspect.target.o"),
  rule: "cc_target",
  inputs: [inspect_c],
});
