const inspect_c = build({
  output: builddir("intermediate/inspect.c"),
  rule: "qjsc",
  inputs: [rel("inspect.js")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("intermediate/inspect.target.o"),
  rule: "cc_target",
  inputs: [inspect_c],
});

build({
  output: builddir("intermediate/inspect.host.o"),
  rule: "cc_host",
  inputs: [inspect_c],
});

build({
  output: builddir("dts/inspect.d.ts"),
  rule: "copy",
  inputs: [rel("inspect.d.ts")],
});
