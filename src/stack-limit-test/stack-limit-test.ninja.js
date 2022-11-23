const { deps_host, deps_target } = require("../archives/full.ninja");

// loop.js

build({
  output: builddir("stack-limit-test/loop.c"),
  rule: "qjsc",
  inputs: [rel("loop.js")],
  implicitInputs: [builddir("qjsc.host")],
  ruleVariables: {
    qjsc_args: `-c -m`,
  },
});

build({
  output: builddir("stack-limit-test/loop.host.o"),
  rule: "cc_host",
  inputs: [builddir("stack-limit-test/loop.c")],
});

build({
  output: builddir("stack-limit-test/loop.target.o"),
  rule: "cc_target",
  inputs: [builddir("stack-limit-test/loop.c")],
});

// main.c

build({
  output: builddir("stack-limit-test/main.host.o"),
  rule: "cc_host",
  inputs: [rel("main.c")],
});

build({
  output: builddir("stack-limit-test/main.target.o"),
  rule: "cc_target",
  inputs: [rel("main.c")],
});

// program

build({
  output: builddir("stack-limit-test.host"),
  rule: "link_host",
  inputs: [
    builddir("stack-limit-test/main.host.o"),
    builddir("stack-limit-test/loop.host.o"),
    ...deps_host,
  ],
});

build({
  output: builddir("stack-limit-test.target"),
  rule: "link_target",
  inputs: [
    builddir("stack-limit-test/main.target.o"),
    builddir("stack-limit-test/loop.target.o"),
    ...deps_target,
  ],
});
