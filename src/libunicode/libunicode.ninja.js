build(builddir("unicode_gen.host"), "compile_host_c_program", [
  builddir("cutils.host.o"),
  rel("unicode_gen.c"),
]);

rule("unicode_gen", {
  command: [builddir("unicode_gen.host"), "$in", "$out"],
});

build(
  builddir("libunicode-table.h"),
  "unicode_gen",
  [rel("downloaded")],
  [
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
  ]
);

build(
  builddir("libunicode.host.o"),
  "compile_host_c_object",
  [rel("libunicode.c")],
  [builddir("libunicode-table.h")]
);
build(
  builddir("libunicode.target.o"),
  "compile_target_c_object",
  [rel("libunicode.c")],
  [builddir("libunicode-table.h")]
);
