build({
  output: builddir("bin/file-to-bytecode.js"),
  rule: "copy",
  inputs: [rel("./file-to-bytecode.js")],
});
