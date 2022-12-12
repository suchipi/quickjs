build({
  output: builddir("intermediate/quickjs-libc.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-libc.c")],
});

build({
  output: builddir("intermediate/quickjs-libc.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-libc.c")],
});

// lib/intervals
const intervals_c = build({
  output: builddir("intermediate/quickjs-libc/intervals.c"),
  rule: "qjsc",
  inputs: [rel("lib/intervals.js")],
  implicitInputs: [builddir("intermediate/qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const intervals_target_o = build({
  output: builddir("intermediate/quickjs-libc/intervals.target.o"),
  rule: "cc_target",
  inputs: [intervals_c],
});

// lib/string-identity
const string_identity_c = build({
  output: builddir("intermediate/quickjs-libc/string-identity.c"),
  rule: "qjsc",
  inputs: [rel("lib/string-identity.js")],
  implicitInputs: [builddir("intermediate/qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const string_identity_target_o = build({
  output: builddir("intermediate/quickjs-libc/string-identity.target.o"),
  rule: "cc_target",
  inputs: [string_identity_c],
});
