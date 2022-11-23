const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("run-test262.host.o"),
  rule: "cc_host",
  inputs: [rel("run-test262.c")],
});

build({
  output: builddir("run-test262.target.o"),
  rule: "cc_target",
  inputs: [rel("run-test262.c")],
});

build({
  output: builddir("run-test262.host"),
  rule: "link_host",
  inputs: [builddir("run-test262.host.o"), ...deps_host],
});

build({
  output: builddir("run-test262.target"),
  rule: "link_target",
  inputs: [builddir("run-test262.target.o"), ...deps_target],
});
