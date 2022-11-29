const { deps_target } = require("../archives/full.ninja");

// NOTE: the filenames for the 'zero' version and the 'fill' version
// have to be the same length, so that they have the same filesize, so
// that the filesize of the 'zero' version can be used to create the
// 'fill' version.

const bootstrap_stub_zero_target_o = build({
  output: builddir("bootstrap-stub-zero.target.o"),
  rule: "cc_target",
  inputs: [rel("bootstrap-stub.c")],
  ruleVariables: {
    cc_args: "-DBOOTSTRAP_STUB_SIZE=0",
  },
});

const bootstrap_stub_zero_target = build({
  output: builddir("bootstrap-stub-zero.target"),
  rule: "link_target",
  inputs: [...deps_target, bootstrap_stub_zero_target_o],
});

// TODO: this command is partially duplicated from rules.ninja.js
rule("build_sized_bootstrap", {
  command: `$CC_TARGET -c $in -o $out $DEFINES_TARGET $CFLAGS_TARGET -DBOOTSTRAP_STUB_SIZE=$$(wc -c ${bootstrap_stub_zero_target} | awk '{print $$1}')`,
  description: "CC_TARGET $out",
});

const bootstrap_stub_fill_target_o = build({
  output: builddir("bootstrap-stub-fill.target.o"),
  rule: "build_sized_bootstrap",
  inputs: [rel("bootstrap-stub.c")],
  implicitInputs: [bootstrap_stub_zero_target],
});

const bootstrap_stub_fill_target = build({
  output: builddir("bootstrap-stub-fill.target"),
  rule: "link_target",
  inputs: [...deps_target, bootstrap_stub_fill_target_o],
});
