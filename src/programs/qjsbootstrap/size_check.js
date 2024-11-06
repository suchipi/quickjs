/// <reference path="../../quickjs/quickjs.d.ts" />
/// <reference path="../../builtin-modules/quickjs-libc/quickjs-libc.d.ts" />
import * as os from "quickjs:os";

const file1 = scriptArgs[2];
const file2 = scriptArgs[3];

if (!(file1 && file2)) {
  throw new Error("Please pass two filenames to this script");
}

const stat1 = os.stat(file1);
const stat2 = os.stat(file2);

if (stat1.size !== stat2.size) {
  throw new Error(`Sizes differ!! ${stat1.size} vs ${stat2.size}`);
}

print(`OK (both files ${stat1.size})`);
