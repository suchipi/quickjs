// import a's namespace (not binding) to avoid reading a before it's set.
// Just log the import succeeded — don't enumerate the namespace while in
// the cycle because `a` may be in the TDZ.
import * as aNS from "./cycle-a.mjs";
export const b = "B";
console.log("cycle-b done, got aNS:", typeof aNS);
