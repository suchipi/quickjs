const core = require("./core.ninja");

const quickjs_full_init_target_o = build({
  output: builddir("intermediate/quickjs-full-init.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-full-init.c")],
});

const quickjs_full_init_host_o = build({
  output: builddir("intermediate/quickjs-full-init.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-full-init.c")],
});

const deps_target = [
  ...core.deps_target,
  quickjs_full_init_target_o,
  builddir("intermediate/inspect.target.o"),
  builddir("intermediate/quickjs-libc/intervals.target.o"),
  builddir("intermediate/quickjs-libc/string-dedent.target.o"),
  builddir("intermediate/quickjs-libc.target.o"),
  builddir("intermediate/quickjs-libcontext.target.o"),
  builddir("intermediate/quickjs-libbytecode.target.o"),
  builddir("intermediate/quickjs-libpointer.target.o"),
  builddir("intermediate/quickjs-libengine.target.o"),
  builddir("intermediate/quickjs-modulesys/module-impl.target.o"),
];

const full_target = build({
  output: builddir("intermediate/quickjs-full.target.a"),
  rule: "ar_target",
  inputs: deps_target,
});

const deps_host = [
  ...core.deps_host,
  quickjs_full_init_host_o,
  builddir("intermediate/inspect.host.o"),
  builddir("intermediate/quickjs-libc/intervals.host.o"),
  builddir("intermediate/quickjs-libc/string-dedent.host.o"),
  builddir("intermediate/quickjs-libc.host.o"),
  builddir("intermediate/quickjs-libcontext.host.o"),
  builddir("intermediate/quickjs-libbytecode.host.o"),
  builddir("intermediate/quickjs-libpointer.host.o"),
  builddir("intermediate/quickjs-libengine.host.o"),
  builddir("intermediate/quickjs-modulesys/module-impl.host.o"),
];

const full_host = build({
  output: builddir("intermediate/quickjs-full.host.a"),
  rule: "ar_host",
  inputs: deps_host,
});

const quickjs_full_a = build({
  output: builddir("lib/quickjs-full.a"),
  rule: "copy",
  inputs: [full_target],
});
