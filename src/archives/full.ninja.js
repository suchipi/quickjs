const core = require("./core.ninja");

const deps_target = [
  ...core.deps_target,
  builddir("intermediate/inspect.target.o"),
  builddir("intermediate/quickjs-libc/lib.target.o"),
  builddir("intermediate/quickjs-libc.target.o"),
  builddir("intermediate/quickjs-libcontext.target.o"),
  builddir("intermediate/quickjs-libbytecode.target.o"),
  builddir("intermediate/quickjs-libpointer.target.o"),
];

const full_target = build({
  output: builddir("intermediate/quickjs-full.target.a"),
  rule: "ar_target",
  inputs: deps_target,
});

const deps_host = [
  ...core.deps_host,
  builddir("intermediate/inspect.host.o"),
  builddir("intermediate/quickjs-libc/lib.host.o"),
  builddir("intermediate/quickjs-libc.host.o"),
  builddir("intermediate/quickjs-libcontext.host.o"),
  builddir("intermediate/quickjs-libbytecode.host.o"),
  builddir("intermediate/quickjs-libpointer.host.o"),
];

const full_host = build({
  output: builddir("intermediate/quickjs-full.host.a"),
  rule: "ar_host",
  inputs: deps_host,
});

build({
  output: builddir("lib/quickjs-full.a"),
  rule: "copy",
  inputs: [full_target],
});
