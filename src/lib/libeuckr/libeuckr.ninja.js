const euckr_gen_host_o = build({
  output: builddir("intermediate/euckr_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("euckr_gen.c")],
});

const euckr_gen_host = build({
  output: builddir("intermediate/euckr_gen.host"),
  rule: "link_host",
  inputs: [euckr_gen_host_o],
});

rule("euckr_gen", {
  command: [euckr_gen_host, "$in", "$out"],
  description: "EUCKR_GEN $out",
});

const libeuckr_table_h = build({
  output: builddir("intermediate/libeuckr-table.h"),
  rule: "euckr_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    euckr_gen_host,
    rel("./downloaded/index-euc-kr.txt"),
  ],
});

build({
  output: builddir("intermediate/libeuckr.host.o"),
  rule: "cc_host",
  inputs: [rel("libeuckr.c")],
  implicitInputs: [libeuckr_table_h],
});
build({
  output: builddir("intermediate/libeuckr.target.o"),
  rule: "cc_target",
  inputs: [rel("libeuckr.c")],
  implicitInputs: [libeuckr_table_h],
});
