const { deps_target } = require("../archives/full.ninja");

// NOTE: the filenames for the 'zero' version and the 'fill' version
// have to be the same length, so that they have the same filesize, so
// that the filesize of the 'zero' version can be used to create the
// 'fill' version.

const qjsbootstrap_zero_target_o = build({
  output: builddir("qjsbootstrap-zero.target.o"),
  rule: "cc_target",
  inputs: [rel("qjsbootstrap.c")],
  ruleVariables: {
    cc_args: "-DBOOTSTRAP_BIN_SIZE=0",
  },
});

const qjsbootstrap_zero_target = build({
  output: builddir("qjsbootstrap-zero.target"),
  rule: "link_target",
  inputs: [...deps_target, qjsbootstrap_zero_target_o],
});

// TODO: this command is partially duplicated from rules.ninja.js
rule("build_sized_bootstrap", {
  command: `$CC_TARGET -c $in -o $out $DEFINES_TARGET $CFLAGS_TARGET -DBOOTSTRAP_BIN_SIZE=$$(wc -c ${qjsbootstrap_zero_target} | awk '{print $$1}')`,
  description: "CC_TARGET $out",
});

const qjsbootstrap_fill_target_o = build({
  output: builddir("qjsbootstrap-fill.target.o"),
  rule: "build_sized_bootstrap",
  inputs: [rel("qjsbootstrap.c")],
  implicitInputs: [qjsbootstrap_zero_target],
});

const qjsbootstrap_fill_target = build({
  output: builddir("qjsbootstrap-fill.target"),
  rule: "link_target",
  inputs: [...deps_target, qjsbootstrap_fill_target_o],
});

const qjsbootstrap_target = build({
  output: builddir("qjsbootstrap.target"),
  rule: "copy",
  inputs: [qjsbootstrap_fill_target],
});

if (env.QUICKJS_EXTRAS === "1") {
  const is_stdin_a_tty_target = build({
    output: builddir("is-stdin-a-tty.target"),
    rule: "combine_into_executable",
    inputs: [qjsbootstrap_target, rel("is-stdin-a-tty.js")],
  });
}
