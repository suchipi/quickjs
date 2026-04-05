import { allInflightRunContexts } from "first-base";

export function teardown() {
  for (const runContext of Array.from(allInflightRunContexts)) {
    console.log("Force-killing", runContext);
    runContext.kill("SIGKILL");
  }
}
