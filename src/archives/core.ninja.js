const deps_host = [
  builddir("cutils.host.o"),
  builddir("libbf.host.o"),
  builddir("libregexp.host.o"),
  builddir("libunicode.host.o"),
  builddir("quickjs.host.o"),
];

const deps_target = [
  builddir("cutils.target.o"),
  builddir("libbf.target.o"),
  builddir("libregexp.target.o"),
  builddir("libunicode.target.o"),
  builddir("quickjs.target.o"),
];

build({
  output: builddir("quickjs-core.host.a"),
  rule: "create_host_archive",
  inputs: deps_host,
});

build({
  output: builddir("quickjs-core.target.a"),
  rule: "create_target_archive",
  inputs: deps_target,
});

module.exports = { deps_host, deps_target };
