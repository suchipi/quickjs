// compiles one or more .c files into one .o file.
// takes 1..n inputs, has one output (the .o file).
rule("cc_host", {
  command: `$CC_HOST -c $in -o $out $DEFINES_HOST $CFLAGS_HOST $cc_args`,
  description: "CC_HOST $out",
});
rule("cc_target", {
  command: `$CC_TARGET -c $in -o $out $DEFINES_TARGET $CFLAGS_TARGET $cc_args`,
  description: "CC_TARGET $out",
});

// compiles one or more .o files into one executable file.
// takes 1..n inputs, has one output (the program file).
rule("link_host", {
  command: `$CC_HOST $in $LDFLAGS_HOST -o $out $LIBS_HOST && rm -rf $out.dSYM`,
  description: "CC_PROG_HOST $out",
});
rule("link_target", {
  command: `$CC_TARGET $in $LDFLAGS_TARGET -o $out $LIBS_TARGET && rm -rf $out.dSYM`,
  description: "CC_PROG_TARGET $out",
});

// compiles one or more .o files into an .a file.
// takes 1..n inputs, has one output (the .a file).
rule("ar_host", {
  command: `$AR_HOST -rcs $out $in`,
  description: "AR_HOST $out",
});
rule("ar_target", {
  command: `$AR_TARGET -rcs $out $in`,
  description: "AR_TARGET $out",
});

// use qjsc to make a .c file containing a byte array of bytecode for a .js file
rule("qjsc", {
  command: [builddir("qjsc.host"), `$qjsc_args -o $out $in`],
  description: "QJSC $out",
});
