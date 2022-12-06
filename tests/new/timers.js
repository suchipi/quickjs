it("setTimeout", async () => {
  const data = [];
  setTimeout(() => {
    data.push("hi");
  }, 100);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(data).toEqual(["hi"]);
});
