try {
  await Promise.reject(new Error("oops from tla-reject"));
  console.log("unexpected success");
} catch (e) {
  console.log("caught:", e.constructor.name, e.message);
}
