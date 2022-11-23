if (env.QUICKJS_EXTRAS === "1") {
  const { deps_target } = require("../archives/full.ninja");

  // loop.js

  const loop_c = build({
    output: builddir("stack-limit-test/loop.c"),
    rule: "qjsc",
    inputs: [rel("loop.js")],
    implicitInputs: [builddir("qjsc.host")],
    ruleVariables: {
      qjsc_args: `-c -m`,
    },
  });

  const loop_target_o = build({
    output: builddir("stack-limit-test/loop.target.o"),
    rule: "cc_target",
    inputs: [loop_c],
  });

  // main.c

  const main_target_o = build({
    output: builddir("stack-limit-test/main.target.o"),
    rule: "cc_target",
    inputs: [rel("main.c")],
  });

  // program

  build({
    output: builddir("stack-limit-test.target"),
    rule: "link_target",
    inputs: [main_target_o, loop_target_o, ...deps_target],
  });
}
