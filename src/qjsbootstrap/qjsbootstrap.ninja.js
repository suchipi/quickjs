// NOTE: the filenames for the 'zero' version and the 'fill' version
// have to be the same length, so that they have the same filesize, so
// that the filesize of the 'zero' version can be used to create the
// 'fill' version.

let qjsbootstrapForExample;

for (const bytecode of [false, true]) {
  const dashByteCode = bytecode ? "-bytecode" : "";

  const qjsbootstrap_zero_target_o = build({
    output: builddir(`intermediate/qjsbootstrap-zero${dashByteCode}.target.o`),
    rule: "cc_target",
    inputs: [rel("qjsbootstrap.c")],
    ruleVariables: {
      cc_args: [
        "-O0",
        bytecode ? `-DCONFIG_BYTECODE` : "",
        "-DBOOTSTRAP_BIN_SIZE=0",
      ].join(" "),
    },
  });

  const qjsbootstrap_zero_target = build({
    output: builddir(`intermediate/qjsbootstrap-zero${dashByteCode}.target`),
    rule: "link_target",
    inputs: [
      qjsbootstrap_zero_target_o,
      builddir("intermediate/quickjs-full.target.a"),
    ],
  });

  const qjsbootstrap_fill_target_o = build({
    output: builddir(`intermediate/qjsbootstrap-fill${dashByteCode}.target.o`),
    rule: "cc_target",
    inputs: [rel("qjsbootstrap.c")],
    implicitInputs: [qjsbootstrap_zero_target],
    ruleVariables: {
      cc_args: [
        "-O0",
        bytecode ? `-DCONFIG_BYTECODE` : "",
        `-DBOOTSTRAP_BIN_SIZE=$$(wc -c ${qjsbootstrap_zero_target} | awk '{print $$1}')`,
      ].join(" "),
    },
  });

  const qjsbootstrap_fill_target = build({
    output: builddir(`intermediate/qjsbootstrap-fill${dashByteCode}.target`),
    rule: "link_target",
    inputs: [
      qjsbootstrap_fill_target_o,
      builddir("intermediate/quickjs-full.target.a"),
    ],
  });

  const qjsbootstrap = build({
    output: builddir(`bin/qjsbootstrap${dashByteCode}$PROGRAM_SUFFIX`),
    rule: "copy",
    inputs: [qjsbootstrap_fill_target],
  });

  if (!bytecode) {
    qjsbootstrapForExample = qjsbootstrap;
  }
}

if (env.QUICKJS_EXTRAS === "1") {
  const is_stdin_a_tty = build({
    output: builddir("extras/is-stdin-a-tty$PROGRAM_SUFFIX"),
    rule: "combine_into_executable",
    inputs: [qjsbootstrapForExample, rel("is-stdin-a-tty.js")],
  });
}
