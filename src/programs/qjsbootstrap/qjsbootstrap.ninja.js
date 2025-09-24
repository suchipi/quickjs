// NOTE: the filenames for the 'zero' version and the 'fill' version
// have to be the same length, so that they have the same filesize, so
// that the filesize of the 'zero' version can be used to create the
// 'fill' version.

let qjsbootstrapForExample;

const qjsbootstrap_size_check_rule = rule("qjsbootstrap_size_check", {
  command: `${builddir(
    "intermediate/quickjs-run.host$PROGRAM_SUFFIX_HOST"
  )} ${rel("size_check.js")} $in > $out`,
  description: "SIZE_CHECK $in",
});
const qjsbootstrap_size_check_rule_implicit_inputs = [
  builddir("intermediate/quickjs-run.host$PROGRAM_SUFFIX_HOST"),
  rel("size_check.js"),
];

for (const bytecode of [false, true]) {
  const dashByteCode = bytecode ? "-bytecode" : "";

  const qjsbootstrap_zero_target_o = build({
    output: builddir(`intermediate/qjsbootstrap-zero${dashByteCode}.target.o`),
    rule: "cc_target",
    inputs: [rel("qjsbootstrap.c")],
    ruleVariables: {
      cc_args: [
        bytecode ? `-DCONFIG_BYTECODE` : "",
        // an arbitrary size that's relatively close and should optimize the same way (hopefully)
        "-DBOOTSTRAP_BIN_SIZE=1221712",
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

  build({
    output: builddir(
      `intermediate/qjsbootstrap-size-check${dashByteCode}.target.txt`
    ),
    rule: qjsbootstrap_size_check_rule,
    inputs: [qjsbootstrap_zero_target, qjsbootstrap_fill_target],
    implicitInputs: qjsbootstrap_size_check_rule_implicit_inputs,
  });

  const qjsbootstrap = build({
    output: builddir(`bin/qjsbootstrap${dashByteCode}$PROGRAM_SUFFIX_TARGET`),
    rule: "copy",
    inputs: [qjsbootstrap_fill_target],
  });

  if (!bytecode) {
    qjsbootstrapForExample = qjsbootstrap;
  }
}

if (env.QUICKJS_EXTRAS === "1") {
  const is_stdin_a_tty = build({
    output: builddir("extras/is-stdin-a-tty$PROGRAM_SUFFIX_TARGET"),
    rule: "combine_into_executable",
    inputs: [qjsbootstrapForExample, rel("is-stdin-a-tty.js")],
  });
}
