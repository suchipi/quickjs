try {
  await Promise.reject(new Error("tla-caught"));
  console.log("unexpected: did not throw");
} catch (e) {
  console.log("caught:", e.message);
}
