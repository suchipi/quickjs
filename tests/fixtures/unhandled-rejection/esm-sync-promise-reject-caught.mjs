Promise.reject(new Error("sync-pr-caught")).catch((e) => {
  console.log("caught:", e.message);
});
