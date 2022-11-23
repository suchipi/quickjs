if (env.QUICKJS_EXTRAS === "1") {
  const { deps_target } = require("../archives/full.ninja");

  const run_test262_target_o = build({
    output: builddir("run-test262.target.o"),
    rule: "cc_target",
    inputs: [rel("run-test262.c")],
  });

  build({
    output: builddir("run-test262.target"),
    rule: "link_target",
    inputs: [run_test262_target_o, ...deps_target],
  });
}
