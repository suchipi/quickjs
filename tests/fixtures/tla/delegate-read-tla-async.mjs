// Entry module: register a custom ModuleDelegate.read that synthesizes a
// virtual module whose source contains top-level await. Then dynamically
// import it (async path) and verify the delegate contract is intact.
import { ModuleDelegate } from "quickjs:engine";

const originalRead = ModuleDelegate.read;
ModuleDelegate.read = (name) => {
  if (name === "virtual:tla") {
    return "export const value = await Promise.resolve('from-virtual');";
  }
  return originalRead(name);
};

// the virtual-name resolver needs to accept bare specifiers as-is
const originalResolve = ModuleDelegate.resolve;
ModuleDelegate.resolve = (name, baseName) => {
  if (name === "virtual:tla") return name;
  return originalResolve(name, baseName);
};

const m = await import("virtual:tla");
console.log("got from virtual TLA module:", m.value);
