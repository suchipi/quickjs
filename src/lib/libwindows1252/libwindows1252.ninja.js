const windows1252_gen_host_o = build({
  output: builddir("intermediate/windows1252_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("windows1252_gen.c")],
});

const windows1252_gen_host = build({
  output: builddir("intermediate/windows1252_gen.host"),
  rule: "link_host",
  inputs: [windows1252_gen_host_o],
});

rule("windows1252_gen", {
  command: [windows1252_gen_host, "$in", "$out"],
  description: "WINDOWS1252_GEN $out",
});

const libwindows1252_table_h = build({
  output: builddir("intermediate/libwindows1252-table.h"),
  rule: "windows1252_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    windows1252_gen_host,
    rel("./downloaded/index-windows-1252.txt"),
  ],
});

build({
  output: builddir("intermediate/libwindows1252.host.o"),
  rule: "cc_host",
  inputs: [rel("libwindows1252.c")],
  implicitInputs: [libwindows1252_table_h],
});
build({
  output: builddir("intermediate/libwindows1252.target.o"),
  rule: "cc_target",
  inputs: [rel("libwindows1252.c")],
  implicitInputs: [libwindows1252_table_h],
});
