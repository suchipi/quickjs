const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("run-test262.host"),
  rule: "compile_host_c_program",
  inputs: [rel("run-test262.c"), ...deps_host],
});

build({
  output: builddir("run-test262.target"),
  rule: "compile_target_c_program",
  inputs: [rel("run-test262.c"), ...deps_target],
});
