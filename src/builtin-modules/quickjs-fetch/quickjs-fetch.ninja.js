if (process.env.CONFIG_FETCH !== "0") {
  build({
    output: builddir("intermediate/quickjs-fetch.host.o"),
    rule: "cc_host",
    inputs: [rel("quickjs-fetch.c")],
  });

  build({
    output: builddir("intermediate/quickjs-fetch.target.o"),
    rule: "cc_target",
    inputs: [rel("quickjs-fetch.c")],
  });
}

build({
  output: builddir("dts/quickjs-fetch.d.ts"),
  rule: "copy",
  inputs: [rel("quickjs-fetch.d.ts")],
});

build({
  output: builddir("include/quickjs-fetch.h"),
  rule: "copy",
  inputs: [rel("quickjs-fetch.h")],
});
