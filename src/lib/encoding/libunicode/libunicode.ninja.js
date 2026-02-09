const unicode_gen_host_o = build({
  output: builddir("intermediate/unicode_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("unicode_gen.c")],
});

const unicode_gen_host = build({
  output: builddir("intermediate/unicode_gen.host"),
  rule: "link_host",
  inputs: [builddir("intermediate/cutils.host.o"), builddir("intermediate/gettime.host.o"), unicode_gen_host_o],
});

rule("unicode_gen", {
  command: [unicode_gen_host, "$in", "$out"],
  description: "UNICODE_GEN $out",
});

const libunicode_table_h = build({
  output: builddir("intermediate/libunicode-table.h"),
  rule: "unicode_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    unicode_gen_host,

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
  output: builddir("intermediate/libunicode.host.o"),
  rule: "cc_host",
  inputs: [rel("libunicode.c")],
  implicitInputs: [libunicode_table_h],
});
build({
  output: builddir("intermediate/libunicode.target.o"),
  rule: "cc_target",
  inputs: [rel("libunicode.c")],
  implicitInputs: [libunicode_table_h],
});
