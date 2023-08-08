const libquickjs_curl_target = build({
  output: builddir("intermediate/libquickjs_curl.target.o"),
  rule: "pic_target",
  inputs: [rel("libquickjs_curl.c")],
});

build({
  output: builddir("lib/libquickjs_curl.so"),
  rule: "shared_library_target",
  inputs: [libquickjs_curl_target],
});
