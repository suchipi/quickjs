if (env.QUICKJS_EXTRAS === "1") {
  // loop.js

  const loop_c = build({
    output: builddir("intermediate/stack-limit-test/loop.c"),
    rule: "qjsc",
    inputs: [rel("loop.js")],
    ruleVariables: {
      qjsc_args: `-c -m`,
    },
  });

  const loop_target_o = build({
    output: builddir("intermediate/stack-limit-test/loop.target.o"),
    rule: "cc_target",
    inputs: [loop_c],
  });

  // main.c

  const main_target_o = build({
    output: builddir("intermediate/stack-limit-test/main.target.o"),
    rule: "cc_target",
    inputs: [rel("main.c")],
  });

  // program

  build({
    output: builddir("extras/stack-limit-test$PROGRAM_SUFFIX_TARGET"),
    rule: "link_target",
    inputs: [
      main_target_o,
      loop_target_o,
      builddir("intermediate/quickjs-full.target.a"),
    ],
  });
}
