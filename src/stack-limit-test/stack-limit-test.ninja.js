const { deps_host, deps_target } = require("../archives/full.ninja");

// loop.js

const loop_c = build({
  output: builddir("stack-limit-test/loop.c"),
  rule: "qjsc",
  inputs: [rel("loop.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

const loop_host_o = build({
  output: builddir("stack-limit-test/loop.host.o"),
  rule: "cc_host",
  inputs: [loop_c],
});

const loop_target_o = build({
  output: builddir("stack-limit-test/loop.target.o"),
  rule: "cc_target",
  inputs: [loop_c],
});

// main.c

const main_host_o = build({
  output: builddir("stack-limit-test/main.host.o"),
  rule: "cc_host",
  inputs: [rel("main.c")],
});

const main_target_o = build({
  output: builddir("stack-limit-test/main.target.o"),
  rule: "cc_target",
  inputs: [rel("main.c")],
});

// program

build({
  output: builddir("stack-limit-test.host"),
  rule: "link_host",
  inputs: [main_host_o, loop_host_o, ...deps_host],
});

build({
  output: builddir("stack-limit-test.target"),
  rule: "link_target",
  inputs: [main_target_o, loop_target_o, ...deps_target],
});
