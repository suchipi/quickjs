const quickjs_libc_host_o = build({
  output: builddir("intermediate/quickjs-libc.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libc.c")],
});

const quickjs_libc_target_o = build({
  output: builddir("intermediate/quickjs-libc.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libc.c")],
});

build({
  output: builddir("dts/quickjs-libc.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libc.d.ts")],
});

build({
  output: builddir("include/quickjs-libc.h"),
  rule: "copy",
  inputs: [rel("quickjs-libc.h")],
});
