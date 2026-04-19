await Promise.reject(new Error("oops from tla-reject-uncaught"));
console.log("unexpected success");
