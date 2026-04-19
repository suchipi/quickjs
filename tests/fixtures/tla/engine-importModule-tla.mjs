import { importModule } from "quickjs:engine";
try {
  const m = importModule("./tla-basic.mjs");
  console.log("unexpected success:", m.value);
} catch (e) {
  console.log("caught:", e.constructor.name, e.message);
}
