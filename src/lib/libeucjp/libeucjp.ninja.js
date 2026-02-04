const eucjp_gen_host_o = build({
  output: builddir("intermediate/eucjp_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("eucjp_gen.c")],
});

const eucjp_gen_host = build({
  output: builddir("intermediate/eucjp_gen.host"),
  rule: "link_host",
  inputs: [eucjp_gen_host_o],
});

rule("eucjp_gen", {
  command: [eucjp_gen_host, "$in", "$out"],
  description: "EUCJP_GEN $out",
});

const libeucjp_table_h = build({
  output: builddir("intermediate/libeucjp-table.h"),
  rule: "eucjp_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    eucjp_gen_host,
    rel("./downloaded/index-jis0208.txt"),
    rel("./downloaded/index-jis0212.txt"),
  ],
});

build({
  output: builddir("intermediate/libeucjp.host.o"),
  rule: "cc_host",
  inputs: [rel("libeucjp.c")],
  implicitInputs: [libeucjp_table_h],
});
build({
  output: builddir("intermediate/libeucjp.target.o"),
  rule: "cc_target",
  inputs: [rel("libeucjp.c")],
  implicitInputs: [libeucjp_table_h],
});
