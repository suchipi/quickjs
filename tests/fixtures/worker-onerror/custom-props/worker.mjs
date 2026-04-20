await Promise.resolve();
throw Object.assign(new Error("boom with extras"), {
  code: "E_FOO",
  detail: { kind: "x" },
});
