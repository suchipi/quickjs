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

const string_dedent_c = build({
  output: builddir("intermediate/quickjs-libc/string-dedent.c"),
  rule: "qjsc",
  inputs: [rel("lib/string-dedent.js")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const string_dedent_target_o = build({
  output: builddir("intermediate/quickjs-libc/string-dedent.target.o"),
  rule: "cc_target",
  inputs: [string_dedent_c],
});

const string_dedent_host_o = build({
  output: builddir("intermediate/quickjs-libc/string-dedent.host.o"),
  rule: "cc_host",
  inputs: [string_dedent_c],
});

build({
  output: builddir("dts/quickjs-libc.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-libc.d.ts")],
});
