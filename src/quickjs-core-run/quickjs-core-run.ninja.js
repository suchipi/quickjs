const quickjs_core_run_target_o = build({
  output: builddir("intermediate/quickjs-core-run.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-core-run.c")],
});

build({
  output: builddir("bin/quickjs-core-run$PROGRAM_SUFFIX"),
  rule: "link_target",
  inputs: [
    quickjs_core_run_target_o,
    builddir("intermediate/quickjs-core.target.a"),
  ],
});

const quickjs_core_run_host_o = build({
  output: builddir("intermediate/quickjs-core-run.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-core-run.c")],
});

build({
  output: builddir("intermediate/quickjs-core-run.host$PROGRAM_SUFFIX"),
  rule: "link_host",
  inputs: [
    quickjs_core_run_host_o,
    builddir("intermediate/quickjs-core.host.a"),
  ],
});
