try {
  require("../tla/tla-basic.mjs");
  console.log("unexpected: did not throw");
} catch (e) {
  console.log("caught:", e.message);
}
