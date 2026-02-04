const gb18030_gen_host_o = build({
  output: builddir("intermediate/gb18030_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("gb18030_gen.c")],
});

const gb18030_gen_host = build({
  output: builddir("intermediate/gb18030_gen.host"),
  rule: "link_host",
  inputs: [gb18030_gen_host_o],
});

rule("gb18030_gen", {
  command: [gb18030_gen_host, "$in", "$out"],
  description: "GB18030_GEN $out",
});

const libgb18030_table_h = build({
  output: builddir("intermediate/libgb18030-table.h"),
  rule: "gb18030_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    gb18030_gen_host,
    rel("./downloaded/index-gb18030.txt"),
    rel("./downloaded/index-gb18030-ranges.txt"),
  ],
});

build({
  output: builddir("intermediate/libgb18030.host.o"),
  rule: "cc_host",
  inputs: [rel("libgb18030.c")],
  implicitInputs: [libgb18030_table_h],
});
build({
  output: builddir("intermediate/libgb18030.target.o"),
  rule: "cc_target",
  inputs: [rel("libgb18030.c")],
  implicitInputs: [libgb18030_table_h],
});
