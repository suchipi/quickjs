if (env.QUICKJS_EXTRAS === "1") {
  const sum_c = build({
    output: builddir("intermediate/sample-program/sum.c"),
    rule: "qjsc",
    inputs: [rel("sum.js")],
    implicitInputs: [builddir("intermediate/qjsc.host")],
    ruleVariables: {
      qjsc_args: `-e -m`,
    },
  });

  const sum_target_o = build({
    output: builddir("intermediate/sample-program/sum.target.o"),
    rule: "cc_target",
    inputs: [sum_c],
  });

  build({
    output: builddir("extras/sample-program/sum"),
    rule: "link_target",
    inputs: [sum_target_o, builddir("intermediate/quickjs-full.target.a")],
  });
}
