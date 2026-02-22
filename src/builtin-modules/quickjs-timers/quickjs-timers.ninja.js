build({
  output: builddir("intermediate/quickjs-timers.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-timers.c")],
});

build({
  output: builddir("intermediate/quickjs-timers.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-timers.c")],
});

build({
  output: builddir("dts/quickjs-timers.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-timers.d.ts")],
});

if (env.QUICKJS_BUILD_DOCS === "1") {
  build({
    output: "meta/docs/quickjs-timers.md",
    rule: "dtsmd",
    inputs: [rel("quickjs-timers.d.ts")],
  });
}

build({
  output: builddir("include/quickjs-timers.h"),
  rule: "copy",
  inputs: [rel("quickjs-timers.h")],
});
