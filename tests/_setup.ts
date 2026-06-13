import { afterAll } from "vitest";
import { allInflightRunContexts, sanitizers } from "first-base";
import { rootDir } from "./_utils";

const wineRepoRoot = "Z:" + rootDir().replaceAll("/", "\\");
sanitizers.push(function replaceWineRootDir(str) {
  return str.replaceAll(wineRepoRoot, "<rootDir>");
});

// Strip `:LINE:COL` from stack-frame `at ...` lines so snapshots stay stable
// when engine internals shift line/column positions. Matches both
// `at <name> (<path>:LINE:COL)` and `at <path>:LINE:COL` (synthetic frames
// without a name).
sanitizers.push(function stripStackFrameLineCol(str) {
  return str
    .replaceAll(/^(\s*at\s[^(\n]*\([^)\n]+):\d+:\d+(\))/gm, "$1$2")
    .replaceAll(/^(\s*at\s[^(\n]+):\d+:\d+(\s*)$/gm, "$1$2");
});

// runs once per test file (after all tests in that file complete) - not once at
// the end of the whole run. each test file gets its own module graph in vitest,
// so the `allInflightRunContexts` Set only contains `RunContext`s spawned by
// this file.
afterAll(() => {
  for (const runContext of Array.from(allInflightRunContexts)) {
    console.log("Force-killing", runContext);
    runContext.kill("SIGKILL");
  }
});
