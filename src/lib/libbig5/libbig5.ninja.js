// Only build if CONFIG_BIG5 is not explicitly set to 0
if (process.env.CONFIG_BIG5 !== "0") {
  const big5_gen_host_o = build({
    output: builddir("intermediate/big5_gen.host.o"),
    rule: "cc_host",
    inputs: [rel("big5_gen.c")],
  });

  const big5_gen_host = build({
    output: builddir("intermediate/big5_gen.host"),
    rule: "link_host",
    inputs: [big5_gen_host_o],
  });

  rule("big5_gen", {
    command: [big5_gen_host, "$in", "$out"],
    description: "BIG5_GEN $out",
  });

  const libbig5_table_h = build({
    output: builddir("intermediate/libbig5-table.h"),
    rule: "big5_gen",
    inputs: [rel("downloaded")],
    implicitInputs: [
      big5_gen_host,
      rel("./downloaded/index-big5.txt"),
    ],
  });

  build({
    output: builddir("intermediate/libbig5.host.o"),
    rule: "cc_host",
    inputs: [rel("libbig5.c")],
    implicitInputs: [libbig5_table_h],
  });
  build({
    output: builddir("intermediate/libbig5.target.o"),
    rule: "cc_target",
    inputs: [rel("libbig5.c")],
    implicitInputs: [libbig5_table_h],
  });
}
