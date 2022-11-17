build(builddir("quickjs-full.host.a"), "create_host_archive", [
  builddir("quickjs-core.host.a"),
  builddir("inspect.host.o"),
  builddir("quickjs-libc.host.o"),
]);

build(builddir("quickjs-full.target.a"), "create_target_archive", [
  builddir("quickjs-core.target.a"),
  builddir("inspect.target.o"),
  builddir("quickjs-libc.target.o"),
]);
