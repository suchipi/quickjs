const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("loop.c"),
  rule: "qjsc",
  inputs: [rel("loop.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("stack-limit-test.host"),
  rule: "compile_host_c_program",
  inputs: [rel("main.c"), builddir("loop.c"), ...deps_host],
});

build({
  output: builddir("stack-limit-test.target"),
  rule: "compile_target_c_program",
  inputs: [rel("main.c"), builddir("loop.c"), ...deps_target],
});
