build({
  output: builddir("unicode_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("unicode_gen.c")],
});

build({
  output: builddir("unicode_gen.host"),
  rule: "link_host",
  inputs: [builddir("cutils.host.o"), builddir("unicode_gen.host.o")],
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
  rule: "cc_host",
  inputs: [rel("libunicode.c")],
  implicitInputs: [builddir("libunicode-table.h")],
});
build({
  output: builddir("libunicode.target.o"),
  rule: "cc_target",
  inputs: [rel("libunicode.c")],
  implicitInputs: [builddir("libunicode-table.h")],
});
