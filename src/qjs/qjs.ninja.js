const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("qjs.host"),
  rule: "compile_host_c_program",
  inputs: [
    rel("qjs.c"),
    ...deps_host,
    builddir("qjscalc.host.o"),
    builddir("repl.host.o"),
  ],
});

build({
  output: builddir("qjs.target"),
  rule: "compile_target_c_program",
  inputs: [
    rel("qjs.c"),
    ...deps_target,
    builddir("qjscalc.target.o"),
    builddir("repl.target.o"),
  ],
});
