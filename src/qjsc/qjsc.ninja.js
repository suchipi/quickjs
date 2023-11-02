const qjsc_host_o = build({
  output: builddir("intermediate/qjsc.host.o"),
  rule: "cc_host",
  inputs: [rel("qjsc.c")],
});

build({
  output: builddir("intermediate/qjsc.host"),
  rule: "link_host",
  inputs: [
    qjsc_host_o,
    builddir("intermediate/quickjs-libc.host.o"),
    builddir("intermediate/quickjs-core.host.a"),
  ],
});

if (!getVar("NO_QJSC_TARGET")) {
  const qjsc_target_o = build({
    output: builddir("intermediate/qjsc.target.o"),
    rule: "cc_target",
    inputs: [rel("qjsc.c")],
  });

  const qjsc_target = build({
    output: builddir("intermediate/qjsc.target"),
    rule: "link_target",
    inputs: [
      qjsc_target_o,
      builddir("intermediate/quickjs-libc.target.o"),
      builddir("intermediate/quickjs-core.target.a"),
    ],
  });

  build({
    output: builddir("bin/qjsc$PROGRAM_SUFFIX"),
    rule: "copy",
    inputs: [qjsc_target],
  });
}
