const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("sum.c"),
  rule: "qjsc",
  inputs: [rel("sum.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-e -m`,
  },
});

build({
  output: builddir("sum.host.o"),
  rule: "cc_host",
  inputs: [builddir("sum.c")],
});

build({
  output: builddir("sum.target.o"),
  rule: "cc_target",
  inputs: [builddir("sum.c")],
});

build({
  output: builddir("sum.host"),
  rule: "link_host",
  inputs: [builddir("sum.host.o"), ...deps_host],
});

build({
  output: builddir("sum.target"),
  rule: "link_target",
  inputs: [builddir("sum.target.o"), ...deps_target],
});
