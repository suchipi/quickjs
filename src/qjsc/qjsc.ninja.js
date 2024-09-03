const qjsc_minimal_host_o = build({
  output: builddir("intermediate/qjsc-minimal.host.o"),
  rule: "cc_host",
  inputs: [rel("qjsc.c")],
  ruleVariables: {
    cc_args: "-DQJSC_MINIMAL",
  },
});

const qjsc_minimal_host = build({
  output: builddir("intermediate/qjsc-minimal.host"),
  rule: "link_host",
  inputs: [
    qjsc_minimal_host_o,
    builddir("intermediate/quickjs-libc.host.o"),
    builddir("intermediate/quickjs-core.host.a"),
  ],
});

const qjsc_host_o = build({
  output: builddir("intermediate/qjsc.host.o"),
  rule: "cc_host",
  inputs: [rel("qjsc.c")],
});

build({
  output: builddir("intermediate/qjsc.host"),
  rule: "link_host",
  inputs: [qjsc_host_o, builddir("intermediate/quickjs-full.host.a")],
});

const qjsc_target_o = build({
  output: builddir("intermediate/qjsc.target.o"),
  rule: "cc_target",
  inputs: [rel("qjsc.c")],
});

const qjsc_target = build({
  output: builddir("intermediate/qjsc.target"),
  rule: "link_target",
  inputs: [qjsc_target_o, builddir("intermediate/quickjs-full.target.a")],
});

build({
  output: builddir("bin/qjsc$PROGRAM_SUFFIX"),
  rule: "copy",
  inputs: [qjsc_target],
});
