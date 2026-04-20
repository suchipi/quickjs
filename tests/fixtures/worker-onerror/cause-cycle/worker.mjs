await Promise.resolve();
const e = new Error("cycle-msg");
e.cause = e;
throw e;
