try {
  const m = require("./tla-basic.mjs");
  console.log("unexpected success:", m.value);
} catch (e) {
  console.log("caught:", e.constructor.name, e.message);
}
