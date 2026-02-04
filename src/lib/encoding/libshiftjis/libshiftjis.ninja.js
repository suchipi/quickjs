// Only build if CONFIG_SHIFTJIS is not explicitly set to 0
if (process.env.CONFIG_SHIFTJIS !== "0") {
  const shiftjis_gen_host_o = build({
    output: builddir("intermediate/shiftjis_gen.host.o"),
    rule: "cc_host",
    inputs: [rel("shiftjis_gen.c")],
  });

  const shiftjis_gen_host = build({
    output: builddir("intermediate/shiftjis_gen.host"),
    rule: "link_host",
    inputs: [shiftjis_gen_host_o],
  });

  rule("shiftjis_gen", {
    command: [shiftjis_gen_host, "$in", "$out"],
    description: "SHIFTJIS_GEN $out",
  });

  const libshiftjis_table_h = build({
    output: builddir("intermediate/libshiftjis-table.h"),
    rule: "shiftjis_gen",
    inputs: [rel("downloaded")],
    implicitInputs: [
      shiftjis_gen_host,
      rel("./downloaded/index-jis0208.txt"),
    ],
  });

  build({
    output: builddir("intermediate/libshiftjis.host.o"),
    rule: "cc_host",
    inputs: [rel("libshiftjis.c")],
    implicitInputs: [libshiftjis_table_h],
  });
  build({
    output: builddir("intermediate/libshiftjis.target.o"),
    rule: "cc_target",
    inputs: [rel("libshiftjis.c")],
    implicitInputs: [libshiftjis_table_h],
  });
}
