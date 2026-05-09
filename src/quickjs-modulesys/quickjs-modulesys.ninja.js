const module_impl_c = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl.c"),
  rule: "qjsc-minimal",
  // TODO: make this <internal>/../module-impl.js in the stack trace
  inputs: [rel("module-impl.js")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const module_impl_host_o = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl.host.o"),
  rule: "cc_host",
  inputs: [module_impl_c],
});

const module_impl_target_o = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl.target.o"),
  rule: "cc_target",
  inputs: [module_impl_c],
});

const module_impl_stub_host_o = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl-stub.host.o"),
  rule: "cc_host",
  inputs: [rel("module-impl-stub.c")],
});

const module_impl_stub_target_o = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl-stub.target.o"),
  rule: "cc_target",
  inputs: [rel("module-impl-stub.c")],
});

build({
  output: builddir("intermediate/quickjs-modulesys.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-modulesys.c")],
});

build({
  output: builddir("intermediate/quickjs-modulesys.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-modulesys.c")],
});

build({
  output: builddir("dts/quickjs-modulesys.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-modulesys.d.ts")],
});

build({
  output: "meta/docs/quickjs-modulesys.md",
  rule: "dtsmd",
  inputs: [rel("quickjs-modulesys.d.ts")],
});

build({
  output: builddir("include/quickjs-modulesys.h"),
  rule: "copy",
  inputs: [rel("quickjs-modulesys.h")],
});
