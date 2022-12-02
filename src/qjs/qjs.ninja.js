const qjs_target_o = build({
  output: builddir("intermediate/qjs.target.o"),
  rule: "cc_target",
  inputs: [rel("qjs.c")],
});

build({
  output: builddir("bin/qjs"),
  rule: "link_target",
  inputs: [
    builddir("intermediate/quickjs-full.target.a"),
    qjs_target_o,
    builddir("intermediate/qjscalc.target.o"),
    builddir("intermediate/repl.target.o"),
  ],
});
