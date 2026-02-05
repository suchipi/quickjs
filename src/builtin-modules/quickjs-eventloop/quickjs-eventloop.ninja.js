build({
  output: builddir("intermediate/quickjs-eventloop.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-eventloop.c")],
});

build({
  output: builddir("intermediate/quickjs-eventloop.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-eventloop.c")],
});

build({
  output: builddir("include/quickjs-eventloop.h"),
  rule: "copy",
  inputs: [rel("quickjs-eventloop.h")],
});

// quickjs-eventloop.h depends on list.h
build({
  output: builddir("include/list.h"),
  rule: "copy",
  inputs: ["src/lib/list/list.h"],
});
