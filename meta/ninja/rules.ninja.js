// compiles one or more .c files into one .o file.
// takes 1..n inputs, has one output (the .o file).
rule("compile_host_c_object", {
  command: `$CC_HOST -c $in $LDFLAGS_HOST -o $out $DEFINES_HOST $CFLAGS_HOST $LIBS_HOST`,
  description: "CC_HOST $out",
});
rule("compile_target_c_object", {
  command: `$CC_TARGET -c $in $LDFLAGS_TARGET -o $out $DEFINES_TARGET $CFLAGS_TARGET $LIBS_TARGET`,
  description: "CC_TARGET $out",
});

// compiles one or more .c or .o files into one executable file.
// takes 1..n inputs, has one output (the program file).
rule("compile_host_c_program", {
  command: `$CC_HOST $in $LDFLAGS_HOST -o $out $DEFINES_HOST $CFLAGS_HOST $LIBS_HOST && rm -rf $out.dSYM`,
  description: "CC_PROG_HOST $out",
});
rule("compile_target_c_program", {
  command: `$CC_TARGET $in $LDFLAGS_TARGET -o $out $DEFINES_TARGET $CFLAGS_TARGET $LIBS_TARGET && rm -rf $out.dSYM`,
  description: "CC_PROG_TARGET $out",
});

// compiles one or more .o files into an .a file.
// takes 1..n inputs, has one output (the .a file).
rule("create_host_archive", {
  command: `$AR_HOST -rcs $out $in`,
  description: "AR_HOST $out",
});
rule("create_target_archive", {
  command: `$AR_TARGET -rcs $out $in`,
  description: "AR_TARGET $out",
});
