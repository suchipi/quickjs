// The C helper function for adding the global
build({
  output: builddir("intermediate/quickjs-inspect.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-inspect.c")],
});

build({
  output: builddir("intermediate/quickjs-inspect.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-inspect.c")],
});

// C bytecode file generated from js
const inspect_c = build({
  output: builddir("intermediate/inspect.c"),
  rule: "qjsc",
  inputs: [rel("inspect.js")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

// The compiled objects containing the bytecode
build({
  output: builddir("intermediate/inspect.host.o"),
  rule: "cc_host",
  inputs: [inspect_c],
});

build({
  output: builddir("intermediate/inspect.target.o"),
  rule: "cc_target",
  inputs: [inspect_c],
});

build({
  output: builddir("dts/quickjs-inspect.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-inspect.d.ts")],
});
