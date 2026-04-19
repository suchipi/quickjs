try {
  const aNS = await import("./cycle-a.mjs");
  const bNS = await import("./cycle-b.mjs");
  console.log("cycle loaded, aNS keys =", Object.keys(aNS).sort().join(","),
              "bNS keys =", Object.keys(bNS).sort().join(","));
} catch (e) {
  console.log("cycle failed:", e.constructor.name, e.message);
}
