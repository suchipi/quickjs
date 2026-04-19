// simple cycle: a imports b's binding `b`, b imports a's namespace.
// a has a top-level await before exporting its binding.
import { b } from "./cycle-b.mjs";
await Promise.resolve();
export const a = "A";
console.log("cycle-a done, saw b =", b);
