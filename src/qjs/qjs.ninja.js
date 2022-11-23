const { deps_host, deps_target } = require("../archives/full.ninja");

build({
  output: builddir("qjs.host.o"),
  rule: "cc_host",
  inputs: [rel("qjs.c")],
});

build({
  output: builddir("qjs.target.o"),
  rule: "cc_target",
  inputs: [rel("qjs.c")],
});

build({
  output: builddir("qjs.host"),
  rule: "link_host",
  inputs: [
    ...deps_host,
    builddir("qjs.host.o"),
    builddir("qjscalc.host.o"),
    builddir("repl.host.o"),
  ],
});

build({
  output: builddir("qjs.target"),
  rule: "link_target",
  inputs: [
    ...deps_target,
    builddir("qjs.target.o"),
    builddir("qjscalc.target.o"),
    builddir("repl.target.o"),
  ],
});
