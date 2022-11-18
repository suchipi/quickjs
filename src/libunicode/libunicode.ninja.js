build({
  output: builddir("unicode_gen.host"),
  rule: "compile_host_c_program",
  inputs: [builddir("cutils.host.o"), rel("unicode_gen.c")],
});

rule("unicode_gen", {
  command: [builddir("unicode_gen.host"), "$in", "$out"],
});

build({
  output: builddir("libunicode-table.h"),
  rule: "unicode_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    builddir("unicode_gen.host"),

    rel("./downloaded/CaseFolding.txt"),
    rel("./downloaded/DerivedNormalizationProps.txt"),
    rel("./downloaded/PropList.txt"),
    rel("./downloaded/SpecialCasing.txt"),
    rel("./downloaded/CompositionExclusions.txt"),
    rel("./downloaded/ScriptExtensions.txt"),
    rel("./downloaded/UnicodeData.txt"),
    rel("./downloaded/DerivedCoreProperties.txt"),
    rel("./downloaded/NormalizationTest.txt"),
    rel("./downloaded/Scripts.txt"),
    rel("./downloaded/PropertyValueAliases.txt"),
    rel("./downloaded/emoji-data.txt"),
  ],
});

build({
  output: builddir("libunicode.host.o"),
  rule: "compile_host_c_object",
  inputs: [rel("libunicode.c")],
  implicitInputs: [builddir("libunicode-table.h")],
});
build({
  output: builddir("libunicode.target.o"),
  rule: "compile_target_c_object",
  inputs: [rel("libunicode.c")],
  implicitInputs: [builddir("libunicode-table.h")],
});
