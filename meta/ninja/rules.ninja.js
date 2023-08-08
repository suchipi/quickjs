// compiles one or more .c files into one .o file.
// takes 1..n inputs, has one output (the .o file).
rule("cc_host", {
  command: `$CC_HOST $DEFINES_HOST $CFLAGS_HOST $cc_args -c $in -o $out`,
  description: "CC_HOST $out",
});
rule("cc_target", {
  command: `$CC_TARGET $DEFINES_TARGET $CFLAGS_TARGET $cc_args -c $in -o $out`,
  description: "CC_TARGET $out",
});

// compiles one or more .o files into one executable file.
// takes 1..n inputs, has one output (the program file).
rule("link_host", {
  command: `$CC_HOST $LDFLAGS_HOST $LIBS_HOST $LDEXPORT_HOST $in -o $out`,
  description: "LINK_HOST $out",
});
rule("link_target", {
  command: `$CC_TARGET $LDFLAGS_TARGET $LIBS_TARGET $LDEXPORT_TARGET $in -o $out`,
  description: "LINK_TARGET $out",
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

// compiles one or more .c files into one .o file, with position-independent
// code enabled (for shared libraries).
// takes 1..n inputs, has one output (the .o file).
rule("pic_host", {
  command: `$CC_HOST -DJS_SHARED_LIBRARY $DEFINES_HOST $CFLAGS_HOST -fPIC $cc_args -c $in -o $out`,
  description: "PIC_HOST $out",
});
rule("pic_target", {
  command: `$CC_TARGET -DJS_SHARED_LIBRARY $DEFINES_TARGET $CFLAGS_TARGET -fPIC $cc_args -c $in -o $out`,
  description: "PIC_TARGET $out",
});

// create shared library (.so file) from .o file. the .o file must have been
// compiled with position-independent code, via pic_host or pic_target.
rule("shared_library_host", {
  command: `$CC_HOST -shared $LIBS_HOST $in -o $out`,
  description: "SHARED_LIBRARY_HOST $out",
});
rule("shared_library_target", {
  command: `$CC_TARGET -shared $LIBS_TARGET $in -o $out`,
  description: "SHARED_LIBRARY_TARGET $out",
});

// use qjsc to make a .c file containing a byte array of bytecode for a .js file
rule("qjsc", {
  command: [builddir("intermediate/qjsc.host"), `$qjsc_args -o $out $in`],
  description: "QJSC $out",
});

// copy a file from one place to another
rule("copy", {
  command: `cp $in $out`,
  description: "COPY $out",
});

// Append files together
rule("combine", {
  command: "cat $in > $out",
  description: "COMBINE $out",
});

// Append files together into something and then mark it as executable
rule("combine_into_executable", {
  command: "cat $in > $out && chmod +x $out",
  description: "COMBINE $out",
});
