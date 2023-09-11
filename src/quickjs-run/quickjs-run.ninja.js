const quickjs_run_target_o = build({
  output: builddir("intermediate/quickjs-run.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-run.c")],
});

build({
  output: builddir("bin/quickjs-run$PROGRAM_SUFFIX"),
  rule: "link_target",
  inputs: [
    quickjs_run_target_o,
    builddir("intermediate/quickjs-full.target.a"),
  ],
});
