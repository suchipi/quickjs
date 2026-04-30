try {
  await import("../tla/tla-reject-uncaught.mjs");
  console.log("unexpected: did not throw");
} catch (e) {
  console.log("caught:", e.message);
}
