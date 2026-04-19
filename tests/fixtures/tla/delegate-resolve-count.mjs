// Entry module: wrap ModuleDelegate.resolve to count invocations, then
// load a TLA module that statically imports one dependency. Verify the
// resolve hook is called synchronously during linking and is not
// duplicated by the Tarjan-DFS async evaluator.
import { ModuleDelegate } from "quickjs:engine";

const calls = [];
const originalResolve = ModuleDelegate.resolve;
ModuleDelegate.resolve = (name, baseName) => {
  calls.push([name, baseName.replace(/.*\/tla\//, "./")]);
  return originalResolve(name, baseName);
};

const m = await import("./delegate-tla-with-dep.mjs");
console.log("got:", m.value);
console.log("resolve calls:");
for (const c of calls) {
  console.log("  " + c[0] + " from " + c[1]);
}
