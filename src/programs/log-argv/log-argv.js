if (env.QUICKJS_EXTRAS === "1") {
  const log_argv_target_o = build({
    output: builddir("intermediate/log-argv.target.o"),
    rule: "cc_target",
    inputs: [rel("log-argv.c")],
  });

  build({
    output: builddir("extras/log-argv$PROGRAM_SUFFIX_TARGET"),
    rule: "link_target",
    inputs: [log_argv_target_o, builddir("intermediate/execpath.target.o")],
  });
}
