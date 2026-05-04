if (env.QUICKJS_EXTRAS === "1" && !getVar("SKIP_RUN_TEST262")) {
  // Apply test262.patch to the test262 submodule's working tree if it
  // isn't already applied. The submodule itself stays at the unmodified
  // upstream commit; we don't own its history and can't push patches
  // back, so the patch is recorded alongside the submodule and applied
  // here. Idempotent: `git apply --check --reverse` succeeds if the
  // patch is already applied, in which case we no-op. The marker file
  // exists purely to give ninja something to depend on; it's
  // re-stamped whenever test262.patch changes.
  //
  // The `patch=$(realpath $in)` dance resolves the patch path to an
  // absolute one before we cd into the submodule (after which the
  // ninja-relative path no longer resolves).
  rule("apply_test262_patch", {
    command: [
      // Resolve $in (the patch) and $out (the marker) to absolute
      // paths up front, so the subsequent `cd` doesn't break them.
      `patch=$$(cd $$(dirname $in) && pwd)/$$(basename $in) &&`,
      `marker=$$(pwd)/$out &&`,
      `cd ${rel("test262")} &&`,
      `(git apply --check --reverse "$$patch" 2>/dev/null`,
      ` || git apply "$$patch")`,
      `&& touch "$$marker"`,
    ].join(" "),
    description: "APPLY_TEST262_PATCH $out",
  });

  const test262_patch_marker = build({
    output: builddir("intermediate/test262-patch.applied"),
    rule: "apply_test262_patch",
    inputs: [rel("test262.patch")],
  });

  const run_test262_target_o = build({
    output: builddir("intermediate/run-test262.target.o"),
    rule: "cc_target",
    inputs: [rel("run-test262.c")],
  });

  build({
    output: builddir("extras/run-test262$PROGRAM_SUFFIX_TARGET"),
    rule: "link_target",
    inputs: [
      run_test262_target_o,
      builddir("intermediate/quickjs-full.target.a"),
    ],
    implicitInputs: [test262_patch_marker],
  });
}
