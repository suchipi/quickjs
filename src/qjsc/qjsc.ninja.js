const { deps_host, deps_target } = require("../archives/core.ninja");

build({
  output: builddir("qjsc.host.o"),
  rule: "cc_host",
  inputs: [rel("qjsc.c")],
});

build({
  output: builddir("qjsc.target.o"),
  rule: "cc_target",
  inputs: [rel("qjsc.c")],
});

build({
  output: builddir("qjsc.host"),
  rule: "link_host",
  inputs: [
    ...deps_host,
    builddir("qjsc.host.o"),
    builddir("quickjs-libc.host.o"),
  ],
});

build({
  output: builddir("qjsc.target"),
  rule: "link_target",
  inputs: [
    ...deps_target,
    builddir("qjsc.target.o"),
    builddir("quickjs-libc.target.o"),
  ],
});
