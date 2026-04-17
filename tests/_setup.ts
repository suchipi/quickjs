import { afterAll } from "vitest";
import { allInflightRunContexts } from "first-base";

// runs once per test file (after all tests in that file complete) — not once at
// the end of the whole run. each test file gets its own module graph in vitest,
// so the `allInflightRunContexts` Set only contains `RunContext`s spawned by
// this file.
afterAll(() => {
  for (const runContext of Array.from(allInflightRunContexts)) {
    console.log("Force-killing", runContext);
    runContext.kill("SIGKILL");
  }
});
