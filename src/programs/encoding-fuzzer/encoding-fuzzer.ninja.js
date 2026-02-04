// Only build encoding fuzzer when QUICKJS_EXTRAS=1
if (process.env.QUICKJS_EXTRAS === "1") {
  const encoding_fuzzer_host_o = build({
    output: builddir("intermediate/encoding-fuzzer.host.o"),
    rule: "cc_host",
    inputs: [rel("encoding-fuzzer.c")],
  });

  build({
    output: builddir("bin/encoding-fuzzer$PROGRAM_SUFFIX_HOST"),
    rule: "link_host",
    inputs: [
      encoding_fuzzer_host_o,
      builddir("intermediate/utf-conv.host.o"),
      builddir("intermediate/libshiftjis.host.o"),
      builddir("intermediate/libwindows1252.host.o"),
      builddir("intermediate/libwindows1251.host.o"),
      builddir("intermediate/libbig5.host.o"),
      builddir("intermediate/libeuckr.host.o"),
      builddir("intermediate/libeucjp.host.o"),
      builddir("intermediate/libgb18030.host.o"),
    ],
  });
}
