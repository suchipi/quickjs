import * as std from "std";
import * as os from "os";

const filename = std.getFileNameFromStack();
const dirname = filename.split("/").slice(0, -1).join("/");

// jasmine expects either `window`, `global`, or `self` to refer to the global...
globalThis.global = globalThis;
// Creates "Jasmine" global
std.loadScript(dirname + "/../../node_modules/@suchipi/jasmine-mini/bundle.js");

const j = new globalThis.Jasmine();
Object.assign(globalThis, j.getInterface());

j.configureDefaultReporter({
  print: (msg) => std.out.puts(msg),
});

const tests = os
  .readdir(dirname)
  .filter(
    (result) =>
      result != "." &&
      result != ".." &&
      result !== "_runAll.js" &&
      result.endsWith(".js")
  );

for (const test of tests) {
  console.log(`loading '${test}'...`);
  describe(test, () => {
    std.importModule("./" + test, filename);
  });
}

j.execute();
