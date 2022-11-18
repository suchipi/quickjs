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
  output: builddir("sum.host"),
  rule: "compile_host_c_program",
  inputs: [builddir("sum.c"), ...deps_host],
});

build({
  output: builddir("sum.target"),
  rule: "compile_target_c_program",
  inputs: [builddir("sum.c"), ...deps_target],
});
