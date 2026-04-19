// Entry module: register a custom compiler for .tla-mjs files that
// wraps the returned source with a top-level await. Then test both
// async and sync loading of the same file — async resolves, sync
// throws with the file name in the message.
import { ModuleDelegate } from "quickjs:engine";

ModuleDelegate.compilers[".tla-mjs"] = (name, source) => {
  return "await Promise.resolve();\n" + source;
};

const mode = scriptArgs[2];
if (mode === "async") {
  const m = await import("./plain.tla-mjs");
  console.log("async got value:", m.value);
} else if (mode === "sync") {
  try {
    const m = require("./plain.tla-mjs");
    console.log("unexpected sync success:", m.value);
  } catch (e) {
    console.log("sync caught:", e.constructor.name, e.message);
  }
} else {
  throw new Error("must pass mode=async or mode=sync");
}
