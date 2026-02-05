const core = require("./core.ninja");

const quickjs_full_init_target_o = build({
  output: builddir("intermediate/quickjs-full-init.target.o"),
  rule: "cc_target",
  inputs: [rel("quickjs-full-init.c")],
});

const quickjs_full_init_host_o = build({
  output: builddir("intermediate/quickjs-full-init.host.o"),
  rule: "cc_host",
  inputs: [rel("quickjs-full-init.c")],
});

const deps_target = [
  ...core.deps_target,
  quickjs_full_init_target_o,
  builddir("intermediate/inspect.target.o"),
  builddir("intermediate/quickjs-eventloop.target.o"),
  builddir("intermediate/quickjs-std.target.o"),
  builddir("intermediate/quickjs-timers.target.o"),
  builddir("intermediate/quickjs-os.target.o"),
  builddir("intermediate/quickjs-cmdline.target.o"),
  builddir("intermediate/quickjs-context.target.o"),
  builddir("intermediate/quickjs-bytecode.target.o"),
  builddir("intermediate/quickjs-pointer.target.o"),
  builddir("intermediate/quickjs-engine.target.o"),
  builddir("intermediate/quickjs-encoding.target.o"),
  builddir("intermediate/quickjs-modulesys/module-impl.target.o"),
];

// Conditionally include encoding libraries based on CONFIG_* env vars
if (process.env.CONFIG_SHIFTJIS !== "0") {
  deps_target.push(builddir("intermediate/libshiftjis.target.o"));
}
if (process.env.CONFIG_WINDOWS1252 !== "0") {
  deps_target.push(builddir("intermediate/libwindows1252.target.o"));
}
if (process.env.CONFIG_WINDOWS1251 !== "0") {
  deps_target.push(builddir("intermediate/libwindows1251.target.o"));
}
if (process.env.CONFIG_BIG5 !== "0") {
  deps_target.push(builddir("intermediate/libbig5.target.o"));
}
if (process.env.CONFIG_EUCKR !== "0") {
  deps_target.push(builddir("intermediate/libeuckr.target.o"));
}
if (process.env.CONFIG_EUCJP !== "0") {
  deps_target.push(builddir("intermediate/libeucjp.target.o"));
}
if (process.env.CONFIG_GB18030 !== "0") {
  deps_target.push(builddir("intermediate/libgb18030.target.o"));
}

const full_target = build({
  output: builddir("intermediate/quickjs-full.target.a"),
  rule: "ar_target",
  inputs: deps_target,
});

const deps_host = [
  ...core.deps_host,
  quickjs_full_init_host_o,
  builddir("intermediate/inspect.host.o"),
  builddir("intermediate/quickjs-eventloop.host.o"),
  builddir("intermediate/quickjs-std.host.o"),
  builddir("intermediate/quickjs-timers.host.o"),
  builddir("intermediate/quickjs-os.host.o"),
  builddir("intermediate/quickjs-cmdline.host.o"),
  builddir("intermediate/quickjs-context.host.o"),
  builddir("intermediate/quickjs-bytecode.host.o"),
  builddir("intermediate/quickjs-pointer.host.o"),
  builddir("intermediate/quickjs-engine.host.o"),
  builddir("intermediate/quickjs-encoding.host.o"),
  builddir("intermediate/quickjs-modulesys/module-impl.host.o"),
];

// Conditionally include encoding libraries based on CONFIG_* env vars
if (process.env.CONFIG_SHIFTJIS !== "0") {
  deps_host.push(builddir("intermediate/libshiftjis.host.o"));
}
if (process.env.CONFIG_WINDOWS1252 !== "0") {
  deps_host.push(builddir("intermediate/libwindows1252.host.o"));
}
if (process.env.CONFIG_WINDOWS1251 !== "0") {
  deps_host.push(builddir("intermediate/libwindows1251.host.o"));
}
if (process.env.CONFIG_BIG5 !== "0") {
  deps_host.push(builddir("intermediate/libbig5.host.o"));
}
if (process.env.CONFIG_EUCKR !== "0") {
  deps_host.push(builddir("intermediate/libeuckr.host.o"));
}
if (process.env.CONFIG_EUCJP !== "0") {
  deps_host.push(builddir("intermediate/libeucjp.host.o"));
}
if (process.env.CONFIG_GB18030 !== "0") {
  deps_host.push(builddir("intermediate/libgb18030.host.o"));
}

const full_host = build({
  output: builddir("intermediate/quickjs-full.host.a"),
  rule: "ar_host",
  inputs: deps_host,
});

const quickjs_full_a = build({
  output: builddir("lib/quickjs-full.a"),
  rule: "copy",
  inputs: [full_target],
});

build({
  output: builddir("include/quickjs-full-init.h"),
  rule: "copy",
  inputs: [rel("quickjs-full-init.h")],
});
