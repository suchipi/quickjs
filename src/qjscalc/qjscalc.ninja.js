rule("qjsc_for_qjscalc", {
  command: [builddir("qjsc.host"), `-fbignum -c -o $out $in`],
  description: `QJSC (CALC) $out`,
});

build(
  builddir("qjscalc.c"),
  "qjsc_for_qjscalc",
  [rel("qjscalc.js")],
  [builddir("qjsc.host")]
);

build(builddir("qjscalc.host.o"), "compile_host_c_object", [
  builddir("qjscalc.c"),
]);

build(builddir("qjscalc.target.o"), "compile_target_c_object", [
  builddir("qjscalc.c"),
]);
