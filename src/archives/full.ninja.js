const core = require("./core.ninja");

const deps_target = [
  ...core.deps_target,
  builddir("intermediate/inspect.target.o"),
  builddir("intermediate/quickjs-libc/lib.target.o"),
  builddir("intermediate/quickjs-libc.target.o"),
  builddir("intermediate/quickjs-bytecodelib.target.o"),
];

const full_target = build({
  output: builddir("intermediate/quickjs-full.target.a"),
  rule: "ar_target",
  inputs: deps_target,
});

build({
  output: builddir("lib/quickjs-full.a"),
  rule: "copy",
  inputs: [full_target],
});
