build({
  output: builddir("intermediate/quickjs-libc.host.o"),
  rule: "cc_host",
  inputs: [
    rel("quickjs-libc.c"),
    builddir("intermediate/quickjs-utils.host.o"),
  ],
});

build({
  output: builddir("intermediate/quickjs-libc.target.o"),
  rule: "cc_target",
  inputs: [
    rel("quickjs-libc.c"),
    builddir("intermediate/quickjs-utils.target.o"),
  ],
});

const filesInLib = glob("**/*.js", { cwd: rel("lib"), absolute: true });

const lib_js = build({
  output: builddir("intermediate/quickjs-libc/lib.js"),
  rule: "combine",
  inputs: filesInLib,
});

const lib_c = build({
  output: builddir("intermediate/quickjs-libc/lib.c"),
  rule: "qjsc",
  inputs: [lib_js],
  implicitInputs: [builddir("intermediate/qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const lib_target_o = build({
  output: builddir("intermediate/quickjs-libc/lib.target.o"),
  rule: "cc_target",
  inputs: [lib_c],
});
