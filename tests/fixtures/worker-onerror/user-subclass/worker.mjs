class MyError extends Error {
  constructor(message) {
    super(message);
    this.name = "MyError";
  }
}
await Promise.resolve();
throw Object.assign(new MyError("custom-msg"), { code: 42 });
