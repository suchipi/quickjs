if (process.env.CONFIG_FETCH !== "0") {
  build({
    output: builddir("intermediate/httpclient.host.o"),
    rule: "cc_host",
    inputs: [rel("httpclient.c")],
  });

  build({
    output: builddir("intermediate/httpclient.target.o"),
    rule: "cc_target",
    inputs: [rel("httpclient.c")],
  });

  build({
    output: builddir("include/httpclient.h"),
    rule: "copy",
    inputs: [rel("httpclient.h")],
  });
}
