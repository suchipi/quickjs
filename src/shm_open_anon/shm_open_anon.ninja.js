build({
  output: builddir("intermediate/shm_open_anon.host.o"),
  rule: "cc_host",
  inputs: [rel("shm_open_anon.c")],
});

build({
  output: builddir("intermediate/shm_open_anon.target.o"),
  rule: "cc_target",
  inputs: [rel("shm_open_anon.c")],
});
