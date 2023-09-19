const module_impl_c = build({
  output: builddir("intermediate/quickjs-modulesys/module-impl.c"),
  rule: "qjsc",
  inputs: [rel("module-impl.js")],
  implicitInputs: [builddir("intermediate/qjsc.host")],
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
