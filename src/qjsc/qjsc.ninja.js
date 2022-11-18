const { deps_host, deps_target } = require("../archives/core.ninja");

build({
  output: builddir("qjsc.host"),
  rule: "compile_host_c_program",
  inputs: [rel("qjsc.c"), ...deps_host, builddir("quickjs-libc.host.o")],
});

build({
  output: builddir("qjsc.target"),
  rule: "compile_target_c_program",
  inputs: [rel("qjsc.c"), ...deps_target, builddir("quickjs-libc.target.o")],
});
