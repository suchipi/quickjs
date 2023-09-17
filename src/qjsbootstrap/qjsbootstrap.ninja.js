const zip_target_o = build({
  output: builddir(`intermediate/zip.target.o`),
  rule: "cc_target",
  inputs: [rel("zip/zip.c")],
  implicitInputs: [rel("zip/zip.h"), rel("zip/miniz.h")],
});

const qjsbootstrap_target_o = build({
  output: builddir(`intermediate/qjsbootstrap.target.o`),
  rule: "cc_target",
  inputs: [rel("qjsbootstrap.c")],
});

const qjsbootstrap = build({
  output: builddir(`bin/qjsbootstrap$PROGRAM_SUFFIX`),
  rule: "link_target",
  inputs: [
    qjsbootstrap_target_o,
    zip_target_o,
    builddir("intermediate/quickjs-full.target.a"),
  ],
});

if (env.QUICKJS_EXTRAS === "1") {
  // TODO make rule for appending zip
  //
  // const is_stdin_a_tty = build({
  //   output: builddir("extras/is-stdin-a-tty$PROGRAM_SUFFIX"),
  //   rule: "combine_into_executable",
  //   inputs: [qjsbootstrap, rel("is-stdin-a-tty.js")],
  // });
}
