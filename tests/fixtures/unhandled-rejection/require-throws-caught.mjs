try {
  require("./esm-throws.mjs");
  console.log("unexpected: did not throw");
} catch (e) {
  console.log("caught:", e.message);
}
