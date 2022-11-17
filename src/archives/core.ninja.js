build(builddir("quickjs-core.host.a"), "create_host_archive", [
  builddir("cutils.host.o"),
  builddir("libbf.host.o"),
  builddir("libregexp.host.o"),
  builddir("libunicode.host.o"),
  builddir("quickjs.host.o"),
]);

build(builddir("quickjs-core.target.a"), "create_target_archive", [
  builddir("cutils.target.o"),
  builddir("libbf.target.o"),
  builddir("libregexp.target.o"),
  builddir("libunicode.target.o"),
  builddir("quickjs.target.o"),
]);
