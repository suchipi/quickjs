const { deps_target } = require("../archives/full.ninja");

const qjs_target_o = build({
  output: builddir("qjs.target.o"),
  rule: "cc_target",
  inputs: [rel("qjs.c")],
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
