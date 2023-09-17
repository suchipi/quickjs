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
  const zip_js = rule("zip_js", {
    command: `${rel("zip-js.sh")} $in $out`,
    description: "ZIP_JS $out",
  });

  const is_stdin_a_tty_zip = build({
    output: builddir("intermediate/is-stdin-a-tty.zip"),
    rule: zip_js,
    inputs: [rel("is-stdin-a-tty.js")],
    implicitInputs: [rel("zip-js.sh")],
  });

  const is_stdin_a_tty = build({
    output: builddir("extras/is-stdin-a-tty$PROGRAM_SUFFIX"),
    rule: "combine_into_executable",
    inputs: [qjsbootstrap, is_stdin_a_tty_zip],
  });
}
