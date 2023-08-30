if (env.QUICKJS_EXTRAS === "1") {
  build({
    output: builddir("extras/fib.so"),
    rule: "shared_lib_target",
    inputs: [rel("fib.c")],
  });
}
