// Entry module: register a custom ModuleDelegate.read returning TLA
// source, then call require() (sync path). Expected: TypeError whose
// message contains the virtual module name.
import { ModuleDelegate } from "quickjs:engine";

const originalRead = ModuleDelegate.read;
ModuleDelegate.read = (name) => {
  if (name === "virtual:tla") {
    return "export const value = await Promise.resolve('from-virtual');";
  }
  return originalRead(name);
};

const originalResolve = ModuleDelegate.resolve;
ModuleDelegate.resolve = (name, baseName) => {
  if (name === "virtual:tla") return name;
  return originalResolve(name, baseName);
};

try {
  const m = require("virtual:tla");
  console.log("unexpected success:", m.value);
} catch (e) {
  console.log("caught:", e.constructor.name, e.message);
}
