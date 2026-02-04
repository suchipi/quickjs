const windows1251_gen_host_o = build({
  output: builddir("intermediate/windows1251_gen.host.o"),
  rule: "cc_host",
  inputs: [rel("windows1251_gen.c")],
});

const windows1251_gen_host = build({
  output: builddir("intermediate/windows1251_gen.host"),
  rule: "link_host",
  inputs: [windows1251_gen_host_o],
});

rule("windows1251_gen", {
  command: [windows1251_gen_host, "$in", "$out"],
  description: "WINDOWS1251_GEN $out",
});

const libwindows1251_table_h = build({
  output: builddir("intermediate/libwindows1251-table.h"),
  rule: "windows1251_gen",
  inputs: [rel("downloaded")],
  implicitInputs: [
    windows1251_gen_host,
    rel("./downloaded/index-windows-1251.txt"),
  ],
});

build({
  output: builddir("intermediate/libwindows1251.host.o"),
  rule: "cc_host",
  inputs: [rel("libwindows1251.c")],
  implicitInputs: [libwindows1251_table_h],
});
build({
  output: builddir("intermediate/libwindows1251.target.o"),
  rule: "cc_target",
  inputs: [rel("libwindows1251.c")],
  implicitInputs: [libwindows1251_table_h],
});
