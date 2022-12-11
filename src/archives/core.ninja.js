const deps_host = [
  builddir("intermediate/cutils.host.o"),
  builddir("intermediate/libbf.host.o"),
  builddir("intermediate/libregexp.host.o"),
  builddir("intermediate/libunicode.host.o"),
  builddir("intermediate/quickjs.host.o"),
  builddir("intermediate/execpath.host.o"),
];

const deps_target = [
  builddir("intermediate/cutils.target.o"),
  builddir("intermediate/libbf.target.o"),
  builddir("intermediate/libregexp.target.o"),
  builddir("intermediate/libunicode.target.o"),
  builddir("intermediate/quickjs.target.o"),
  builddir("intermediate/execpath.target.o"),
];

build({
  output: builddir("intermediate/quickjs-core.host.a"),
  rule: "ar_host",
  inputs: deps_host,
});

const core_target = build({
  output: builddir("intermediate/quickjs-core.target.a"),
  rule: "ar_target",
  inputs: deps_target,
});

build({
  output: builddir("lib/quickjs-core.a"),
  rule: "copy",
  inputs: [core_target],
});

module.exports = { deps_host, deps_target };
