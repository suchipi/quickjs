const { deps_host, deps_target } = require("../archives/full.ninja");

const qjs_host_o = build({
  output: builddir("qjs.host.o"),
  rule: "cc_host",
  inputs: [rel("qjs.c")],
});

const qjs_target_o = build({
  output: builddir("qjs.target.o"),
  rule: "cc_target",
  inputs: [rel("qjs.c")],
});

build({
  output: builddir("qjs.host"),
  rule: "link_host",
  inputs: [
    ...deps_host,
    qjs_host_o,
    builddir("qjscalc.host.o"),
    builddir("repl.host.o"),
  ],
});

build({
  output: builddir("qjs.target"),
  rule: "link_target",
  inputs: [
    ...deps_target,
    qjs_target_o,
    builddir("qjscalc.target.o"),
    builddir("repl.target.o"),
  ],
});
