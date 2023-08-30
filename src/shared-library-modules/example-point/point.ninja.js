if (env.QUICKJS_EXTRAS === "1") {
  build({
    output: builddir("extras/point.so"),
    rule: "shared_lib_target",
    inputs: [rel("point.c")],
  });
}
