// The C helper function for adding the global
build({
  output: builddir("intermediate/quickjs-intervals.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-intervals.c")],
});

build({
  output: builddir("intermediate/quickjs-intervals.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-intervals.c")],
});

// C bytecode file generated from js
const intervals_c = build({
  output: builddir("intermediate/intervals.c"),
  rule: "qjsc-minimal",
  inputs: [rel("intervals.js")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

// The compiled objects containing the bytecode
build({
  output: builddir("intermediate/intervals.host.o"),
  rule: "cc_host",
  inputs: [intervals_c],
});

build({
  output: builddir("intermediate/intervals.target.o"),
  rule: "cc_target",
  inputs: [intervals_c],
});

build({
  output: builddir("dts/quickjs-intervals.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-intervals.d.ts")],
});
