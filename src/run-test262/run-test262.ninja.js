if (env.QUICKJS_EXTRAS === "1") {
  const run_test262_target_o = build({
    output: builddir("intermediate/run-test262.target.o"),
    rule: "cc_target",
    inputs: [rel("run-test262.c")],
  });

  build({
    output: builddir("extras/run-test262$DOTEXE"),
    rule: "link_target",
    inputs: [
      run_test262_target_o,
      builddir("intermediate/quickjs-full.target.a"),
    ],
  });
}
